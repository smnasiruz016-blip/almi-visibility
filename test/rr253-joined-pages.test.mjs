/**
 * RR-253 / RR-254 · THE JOINED TEST PAGES (the owner's page shape, `_handoffs` …RR-253_ANSWERS_TO_THE_BUILD_STOP.md; Specification Amendment 6
 * as the owner clarified it, …OWNER_CLARIFICATION_2026-10-12_RR-254_SPECIFICATION_AMENDMENT_6_WHOLE_PAGES_ONLY.md: cancel-and-move applies
 * to WHOLE pages only, a shared question stays on each page) and the owner's STANDING PAGE LAW and TITLE LAW (RR-255: the client's own design,
 * hero, key-fact cards, expand/collapse Q&A with sources, product cards, FAQPage data equal to the visible Q&A, no record label visible, no
 * unanswered need shown; a title composed only from recorded search phrases).
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

import { cancelSamePages, samePagePairs, connectionDrafts, productStatements, joinPages, joinedChecks, renderJoined, orderedQuestions, composeTitle, titleWordsTraced, capitalsIn, keyFactCards, faqOf, faqInPage, SURVIVOR_RULE, REFUSAL, JOINED_RECORD, CANCELLATION_RECORD, TIER_WORDS, PRODUCT_STATEMENT_LABEL, RECORD_LABELS, STRUCTURE } from "../src/page/joined-page.mjs";
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
/* a neutral client design, as a questionnaire would file it */
const DESIGN = { siteAddress: "https://client.invalid", brandName: "Standin", productLine: "Standin — a stand-in product line.", logo: { mark: "S", wordmark: "Standin" },
  colours: { background: "#FFFEF0", surface: "#FFFFFF", border: "#EEDDCC", primary: "#AA3322", ink: "#111122", text: "#333344", muted: "#555566", footerBackground: "#101010", footerAccent: "#CCAA55", onDark: "#FAFAFA" },
  fonts: { body: "Verdana, sans-serif" }, card: { radius: "14px" }, nav: [{ label: "Try it", href: "/try" }], cta: { label: "Start now", href: "/start" },
  footer: { columns: [{ title: "Company", links: [{ label: "About", href: "https://client.invalid/about" }] }], notice: "© Standin." }, basis: "CLIENT_DECLARED" };
const joined = (construction, over = {}) => joinPages({ construction, renderNeed: passing, stamp: STAMP, design: DESIGN, productLine: DESIGN.productLine, ...over });
const failed = (p) => Object.entries(p.checks).filter(([, v]) => v.state === "FAIL").map(([k]) => k);
const LAWS = ["law1ClientDesign", "law2Hero", "law3KeyFacts", "law4QuestionsAndAnswers", "law5ProductCards", "law6FaqMatchesVisible", "law7NoRecordLabels", "law8UnansweredNotShown"];

test("JOIN · FIRING CONTROL: one page per page candidate, every chosen need on it as ONE item with its own questions and its own answer, in the order handed in; nothing chosen, nothing built", () => {
  const order = { n2: 0, n1: 1, n3: 0 };
  const pages = joined([built("n1", "alpha", [["how much is it", INF], ["How much does it cost?", OBS]]), built("n2", "alpha", [["Where is it?", OBS]]), built("n3", "beta", [["how long is it", INF]])], { orderOf: (id) => order[id] });
  assert.deepEqual(pages.map((p) => [p.record_type, p.value, p.items, p.questions, p.faqCount]), [[JOINED_RECORD, "alpha", 2, 3, 2], [JOINED_RECORD, "beta", 1, 1, 1]]);
  const a = pages[0];
  assert.deepEqual(a.itemList.map((it) => [it.needId, it.questions.map((q) => q.wording), it.claims.map((c) => c.claimId)]), [["n2", ["Where is it?"], ["n2-1"]], ["n1", ["How much does it cost?", "how much is it"], ["n1-1"]]]);
  for (const w of ["How much does it cost?", "how much is it", "Where is it?", "Statement n1-1.", `${STRUCTURE.source}: A Body — its page`, "https://body.invalid/p", `${STRUCTURE.lastChecked}: 2026-09-01`]) assert.ok(a.html.includes(w), `the page does not show: ${w}`);
  assert.ok(!a.html.includes("how long is it"), "another page's need is on this page");
  assert.equal(a.html.split(STAMP).length - 1, 2, "the page does not say, top and bottom, what it is");
  assert.match(a.html, /<meta name="robots" content="noindex, nofollow">/);
  assert.deepEqual([a.html.split("<script").length - 1, a.html.split('<script type="application/ld+json">').length - 1], [1, 1], "the page runs a script");
  assert.doesNotMatch(a.html, /<link |<img |<iframe|@import|url\(/, "the page loads something from outside itself");
  assert.deepEqual(a.trace.map((t) => [t.needId, t.claimId, t.label, t.source, t.link, t.readOn]), [["n2", "n2-1", "RESPONSIBLE BODY", "A Body — its page", "https://body.invalid/p", "2026-09-01"], ["n1", "n1-1", "RESPONSIBLE BODY", "A Body — its page", "https://body.invalid/p", "2026-09-01"]], "the record lost a label");
  assert.deepEqual(joined([]), [], "a page was built from no chosen need");
  assert.throws(() => joinPages({ construction: [built("n1", "alpha", [["q?", OBS]])], renderNeed: passing, stamp: "" }), /stamp/);
});

test("PAGE LAW · FIRING CONTROL: a page built with the client's design, a hero, cards, expand/collapse Q&A, product cards and matching FAQ data passes all eight clauses — and each clause fails alone", () => {
  const two = [built("n1", "alpha", [["how much is it", INF], ["How much does it cost?", OBS]], [label("n1-1", { text: "It costs 5 XTS a month." })]), built("n2", "alpha", [["Where is it?", OBS]])];
  const product = { shown: [{ answerId: "does-x", text: "It does x.", label: PRODUCT_STATEMENT_LABEL, source: "Standin's own statement (owner-approved, 2026-09-01)", link: "https://client.invalid", approvalRecord: "r@a" }], refused: [] };
  const opts = { orderOf: (id) => Number(id.slice(1)), keyFactsFor: () => [{ claimId: "n1-1", value: "5 XTS" }], statementsFor: (id) => (id === "n1" ? product : { shown: [], refused: [] }), unansweredFor: () => [{ need: "n9", questions: 1, wordings: ["Is it open at night?"], why: "the central answer is unsupported" }] };
  const p = joined(two, opts)[0];
  assert.deepEqual(LAWS.map((k) => p.checks[k].state), LAWS.map(() => "PASS"), JSON.stringify(p.checks));
  /* 1 design · 2 hero · 3 cards · 4 Q&A · 5 product cards */
  for (const w of ["Standin", "#AA3322", "Verdana, sans-serif", "https://client.invalid/try", "Try it", "© Standin.", "<h1>", "Standin — a stand-in product line.", "2 questions answered below, each with its source.", '<a class="cta" href="https://client.invalid/start">Start now</a>',
    '<span class="v">5 XTS</span>', "<details", "<summary>How much does it cost?</summary>", `${STRUCTURE.alsoAsked}: how much is it`, '<div class="product" data-answer-id="does-x"><p>It does x.</p><a class="cta"']) assert.ok(p.html.includes(w), `missing on the page: ${w}`);
  assert.deepEqual(p.keyFacts.map((c) => [c.label, c.value, c.source, c.link]), [["How much does it cost?", "5 XTS", "A Body — its page", "https://body.invalid/p"]]);
  /* 6 · the FAQ data IS the visible Q&A */
  assert.deepEqual(faqInPage(p.html), [{ question: "How much does it cost?", answer: "It costs 5 XTS a month." }, { question: "Where is it?", answer: "Statement n2-1." }]);
  assert.deepEqual(faqInPage(p.html), faqOf(p.itemList).map((x) => ({ ...x })));
  /* 7 · no record label is visible: not the tier words, not the source label, not the product statement's record label */
  const seen = p.html.replace(/<(script|style)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ");
  for (const w of [TIER_WORDS.OBSERVED, TIER_WORDS["RESEARCH-DERIVED"], "RESPONSIBLE BODY", "owner-approved", "self-sourced"]) assert.ok(!seen.includes(w), `a record label is visible: ${w}`);
  assert.equal(RECORD_LABELS.test(seen), false);
  /* 8 · the unanswered need is in the record by name, never on the page */
  assert.deepEqual([p.unanswered.map((u) => u.need), p.html.includes("Is it open at night?"), failed(p)], [["n9"], false, ["everyNeedAnswered"]]);
  /* each clause fails alone */
  assert.deepEqual(failed(joined(two, { ...opts, unansweredFor: () => [], design: null })[0]).filter((k) => k.startsWith("law")), ["law1ClientDesign", "law2Hero", "law5ProductCards"], "a page with no client design passed the design, hero or product-card clause");
  assert.deepEqual(failed(joined(two, { ...opts, unansweredFor: () => [], design: { ...DESIGN, cta: undefined } })[0]).filter((k) => k.startsWith("law")), ["law2Hero", "law5ProductCards"]);
  assert.deepEqual(failed(joined(two, { ...opts, unansweredFor: () => [], keyFactsFor: () => [{ claimId: "n1-1", value: "6 XTS" }] })[0]), ["law3KeyFacts"], "a card value that is not in its recorded claim passed");
  assert.equal(joined(two, { ...opts, keyFactsFor: () => [] })[0].checks.law3KeyFacts.state, "NOT MEASURED");
  assert.deepEqual(failed(joined(two, { ...opts, unansweredFor: () => [], statementsFor: () => ({ shown: [], refused: [{ answerId: "x", code: REFUSAL.NOT_APPROVED }] }) })[0]), ["law5ProductCards"]);
  const base = { items: p.itemList, stamp: STAMP, title: p.title, titleTrace: p.titleTrace, lastChecked: p.lastChecked, design: DESIGN, intro: ["Standin — a stand-in product line.", "2 questions answered below, each with its source."], cards: p.keyFacts, faq: faqOf(p.itemList) };
  const only = (html, over = {}) => Object.entries(joinedChecks({ ...base, html, ...over })).filter(([k, v]) => k.startsWith("law") && v.state === "FAIL").map(([k]) => k);
  assert.deepEqual(only(p.html), []);
  assert.deepEqual(only(p.html.replace(`${STRUCTURE.lastChecked}: 2026-09-01`, "")), ["law4QuestionsAndAnswers"]);
  assert.deepEqual(only(p.html.replace('"text":"It costs 5 XTS a month."', '"text":"It costs 4 XTS a month."')), ["law6FaqMatchesVisible"], "FAQ data that differs from the visible answer passed");
  assert.deepEqual(only(p.html.replace("<summary>Where is it?</summary>", "<summary>Where is it?</summary><p>RESPONSIBLE BODY</p>")), ["law7NoRecordLabels"]);
  assert.deepEqual(only(p.html.replace("</main>", "<p>Is it open at night?</p></main>"), { unanswered: [{ need: "n9", wordings: ["Is it open at night?"] }] }), ["law8UnansweredNotShown"]);
});

test("TITLE LAW · FIRING CONTROL: a title is COMPOSED only from recorded search phrases and the date fact, every word traced; with no phrase nothing is composed", () => {
  const phrases = [{ phraseId: "p1", text: "widget for makers in atlantis", role: "HEAD" }, { phraseId: "p3", text: "abc score", role: "TOPIC", need: "k3" }, { phraseId: "p2", text: "price", role: "TOPIC", need: "k1" }, { phraseId: "p4", text: "test centres", role: "TOPIC", need: "k2" }, { phraseId: "p5", text: "opening hours", role: "TOPIC", need: "k4" }];
  const c = composeTitle({ phrases, needOrder: ["k1", "k2", "k3", "k4"], lastChecked: "2026-09-01", capitals: capitalsIn(["What ABC score is needed?"]) });
  assert.equal(c.title, "Widget for Makers in Atlantis 2026: Price, Test Centres & ABC Score");
  assert.deepEqual(c.trace.map((t) => [t.part, t.from]), [["Widget for Makers in Atlantis", "search-phrase:p1"], ["2026", "date-fact:last-checked:2026-09-01"], ["Price", "search-phrase:p2"], ["Test Centres", "search-phrase:p4"], ["ABC Score", "search-phrase:p3"]]);
  assert.deepEqual(titleWordsTraced({ title: c.title, phrases, lastChecked: "2026-09-01" }), []);
  assert.deepEqual(titleWordsTraced({ title: `${c.title} Guaranteed`, phrases, lastChecked: "2026-09-01" }), ["guaranteed"], "CONTROL: a word no record holds must be seen");
  assert.deepEqual(titleWordsTraced({ title: c.title, phrases, lastChecked: null }), ["2026"], "the year passed without its date fact");
  const none = composeTitle({ phrases: phrases.filter((p) => p.role !== "HEAD"), needOrder: [], lastChecked: "2026-09-01" });
  assert.deepEqual([none.title, /nothing is composed/.test(none.missing)], [null, true]);
  /* on a page: composed when a HEAD phrase is recorded for it, and the gate says so; otherwise recorded questions, the gate NOT MEASURED */
  const items = [built("n1", "alpha", [["How much does it cost?", OBS]]), built("n2", "alpha", [["Where is it?", OBS]])];
  const withPhrases = joined(items, { orderOf: (id) => Number(id.slice(1)), needKeyOf: (id) => ({ n1: "k1", n2: "k2" })[id], phrasesFor: () => phrases })[0];
  assert.deepEqual([withPhrases.title, withPhrases.titleComposed, withPhrases.checks.titleFromSearchPhrases.state, withPhrases.checks.titleFromRecords.state], ["Widget for Makers in Atlantis 2026: Price, Test Centres & Abc Score", true, "PASS", "PASS"]);
  assert.match(withPhrases.html, /<h1>Widget for Makers in Atlantis 2026: Price, Test Centres &amp; Abc Score<\/h1>/);
  const without = joined(items, { orderOf: (id) => Number(id.slice(1)) })[0];
  assert.deepEqual([without.title, without.titleComposed, without.checks.titleFromSearchPhrases.state, without.titleTrace.map((t) => t.from)], ["How much does it cost? · Where is it?", false, "NOT MEASURED", ["recorded-question:n1-q0", "recorded-question:n2-q0"]]);
  assert.equal(joinedChecks({ items: without.itemList, html: without.html, stamp: STAMP, title: "A written title", titleTrace: [{ part: "A written title", from: "nowhere" }] }).titleFromRecords.state, "FAIL", "a title that is no recorded phrase or question passed");
  assert.equal(joinedChecks({ items: without.itemList, html: without.html, stamp: STAMP, title: "Widget Guaranteed", titleTrace: [{ part: "Widget", from: "search-phrase:p1" }], composed: true, phrases }).titleFromSearchPhrases.state, "FAIL", "a composed title with an untraced word passed");
});

test("WORDING and KEY FACTS · FIRING CONTROL: a heading is a recorded question, an OBSERVED one before an inferred one; a card's value must stand inside its recorded claim", () => {
  assert.deepEqual(orderedQuestions([{ questionId: "a", tier: INF }, { questionId: "c", tier: OBS }, { questionId: "b", tier: OBS }]).map((q) => q.questionId), ["b", "c", "a"]);
  const p = joined([built("n1", "alpha", [["how much is it", INF], ["How much does it cost?", OBS]]), built("n2", "alpha", [["where do i sit it", INF]])], { orderOf: (id) => Number(id.slice(1)) })[0];
  assert.deepEqual(p.itemList.map((it) => [it.heading.wording, it.heading.tier, it.heading.questionId]), [["How much does it cost?", OBS, "n1-q1"], ["where do i sit it", INF, "n2-q0"]]);
  assert.equal(p.checks.headingsFromQuestions.state, "PASS");
  assert.equal(joinedChecks({ items: p.itemList.map((it, i) => (i === 0 ? { ...it, heading: { ...it.questions[1] }, questions: [it.questions[1], it.questions[0]] } : it)), html: p.html, stamp: STAMP }).headingsFromQuestions.state, "FAIL", "an observed question was passed over for a heading");
  const k = keyFactCards({ facts: [{ claimId: "n1-1", value: "Statement" }, { claimId: "n1-1", value: "42" }, { claimId: "nope", value: "x" }, { claimId: "n2-1", value: "" }], items: p.itemList });
  assert.deepEqual([k.cards.map((c) => [c.claimId, c.label, c.value]), k.refused.map((r) => r.code)], [[["n1-1", "How much does it cost?", "Statement"]], [REFUSAL.KEY_FACT, REFUSAL.KEY_FACT, REFUSAL.KEY_FACT]]);
});

test("GATES · FIRING CONTROL: each older check still fails for its own reason and no other; what has no judge is NOT MEASURED, never passed", () => {
  const one = (labels) => [built("n1", "alpha", [["q?", OBS]], labels)];
  assert.deepEqual(failed(joined(one())[0]), []);
  assert.deepEqual(failed(joined(one([label("c", { link: "" })]))[0]), ["everyClaimSourced"]);
  assert.deepEqual(failed(joined(one([label("c", { readOn: "last week" })]))[0]), ["law4QuestionsAndAnswers", "everyClaimSourced"]);
  assert.deepEqual(failed(joined(one([label("c", { central: false })]))[0]), ["everyItemAnswered"]);
  assert.deepEqual(failed(joined(one([label("c", { text: "This page will rank first on search." })]))[0]), ["noPromise"]);
  assert.deepEqual(failed(joined(one(), { renderNeed: () => ({ state: "RENDERED", checks: { ...passing().checks, headingsMatch: { state: CHECK.FAIL } } }) })[0]), ["needHeadingsMatch"]);
  const good = joined(one())[0];
  for (const k of ["internalLinks", "technical", "engaging", "acceptableToSearchAndAnswerEngines", "titleFromSearchPhrases", "law3KeyFacts"]) assert.equal(good.checks[k].state, "NOT MEASURED", k);
  assert.equal(joinedChecks({ items: good.itemList, html: renderJoined({ title: "t", stamp: STAMP, items: good.itemList }).replace(STAMP, "x"), stamp: STAMP }).stamped.state, "FAIL");
});

/* ================= REAL ================= */

test("REAL · the declared product's test drafts rebuilt under the page law (RR-255): all eight clauses hold, the FAQ data is the visible Q&A, no record label is visible, the title is traced, unanswered needs stay in the record", async () => {
  const BATCH = "rr254-test-pages-2026-10-12";
  const dir = join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH);
  const file = join(dir, "joined-pages.jsonl");
  assert.ok(existsSync(file), "the built drafts are not in the research batch");
  assert.ok(!dir.replace(/\\/g, "/").startsWith(REPO.replace(/\\/g, "/")), "the built drafts live inside the engine repository");
  const rows = readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  /* the batch keeps every build; the LATEST draft of each page value is the page */
  const pages = [...new Map(rows.filter((r) => r.record_type === JOINED_RECORD).map((r) => [r.value, r])).values()];
  const cancels = rows.filter((r) => r.record_type === CANCELLATION_RECORD);
  assert.ok(pages.length > 0, "EMPTY real population");
  const product = await productFromArgv(["node", "x", "--product=almi-oet"], { scope: censusSubjectScope("almi-oet") });
  const filed = await readProductQuestionnaire(product);
  const approved = new Set(filed.claims.map((c) => c.capabilityId));
  const proposed = JSON.parse(readFileSync(join(dir, "page-drafts.json"), "utf8"));
  for (const p of pages) {
    assert.equal(p.stamp, STAMP);
    assert.equal(p.html.split(STAMP).length - 1, 2);
    assert.match(p.exception.record.commit, /^[0-9a-f]{40}$/);
    assert.ok(p.items > 0 && p.itemList.length === p.items && p.faqCount === p.items);
    assert.deepEqual(LAWS.map((k) => p.checks[k].state), LAWS.map(() => "PASS"), `${p.value}: a clause of the page law does not hold`);
    assert.ok(p.html.includes(filed.questionnaire.design.brandName) && p.html.includes(filed.questionnaire.design.colours.primary) && p.html.includes(filed.questionnaire.design.cta.label), `${p.value}: the page does not wear the client's filed design`);
    assert.deepEqual(faqInPage(p.html), p.itemList.map((it) => ({ question: it.heading.wording, answer: it.claims.map((c) => c.text.trim()).join(" ") })), `${p.value}: the FAQ data is not the visible Q&A`);
    const seen = p.html.replace(/<(script|style)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ");
    assert.equal(RECORD_LABELS.test(seen), false, `${p.value}: a record label is visible`);
    for (const u of p.unanswered) for (const w of u.wordings) assert.ok(!p.html.includes(w), `${p.value}: an unanswered need is on the page`);
    /* the title law: no search phrase is recorded for these pages, so nothing was composed and the gate says so; the title is traced to recorded questions */
    const recorded = new Map(p.itemList.flatMap((it) => it.questions.map((q) => [`recorded-question:${q.questionId}`, q.wording])));
    assert.deepEqual([p.titleComposed, p.checks.titleFromSearchPhrases.state, p.checks.titleFromRecords.state], [false, "NOT MEASURED", "PASS"]);
    assert.deepEqual(p.titleTrace.map((t) => recorded.get(t.from)), p.titleTrace.map((t) => t.part), `${p.value}: a title part is not the recorded question its trace names`);
    for (const c of p.keyFacts) assert.ok(p.itemList.some((it) => it.claims.some((x) => x.claimId === c.claimId && x.text.includes(c.value))), `${p.value}: a key fact is not in its recorded claim`);
    for (const it of p.itemList) {
      assert.ok(it.claims.length > 0 && it.claims.every((c) => c.text && c.source && /^https:\/\//.test(c.link) && /^\d{4}-\d{2}-\d{2}$/.test(c.readOn)), `${p.value}: an item's claim lacks its statement, source, link or date`);
      assert.ok(it.statements.every((st) => approved.has(st.answerId)), `${p.value}: a product statement is not an approved answer today`);
    }
    /* the only gate that may fail is "every need answered" — and exactly when the record names an unanswered need */
    assert.deepEqual(failed(p), p.unanswered.length ? ["everyNeedAnswered"] : [], `${p.value}: a gate fails`);
    for (const k of ["engaging", "acceptableToSearchAndAnswerEngines"]) assert.equal(p.checks[k].state, "NOT MEASURED");
  }
  const live = cancelSamePages(proposed);
  assert.deepEqual([cancels.length, live.cancellations.length, live.cancelledPages.length], [0, 0, 0], "a page was cancelled although no two whole pages serve the same need");
  assert.ok(live.shared.length > 0, "no shared question: the owner's clarification is not exercised on the real pages");
  console.log(`  REAL (count-only): ${JSON.stringify({ pages: pages.map((p) => ({ value: p.value, items: p.items, questions: p.questions, faq: p.faqCount, keyFacts: p.keyFacts.length, words: p.wordCount, unanswered: p.unanswered.length, titleComposed: p.titleComposed, pass: Object.values(p.checks).filter((v) => v.state === "PASS").length, fail: failed(p).length, notMeasured: Object.values(p.checks).filter((v) => v.state === "NOT MEASURED").length })), sharedQuestionPairs: live.shared.length, cancellations: cancels.length })}`);
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
