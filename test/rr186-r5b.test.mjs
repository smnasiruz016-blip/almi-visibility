/**
 * 🔴 RR-186 · R5b — F37 ACCEPTANCE AMENDMENT 1, C7 · EACH DISTINCT CLAIM ONCE; LATER MENTIONS REFER BACK (acceptance _handoffs 998ef05,
 * approved by its hash 3be6e3bd…, contract 4f98d214…; the owner's ruling in RR-185).
 *
 * ONE TEST FOR THE C7 EVIDENCE LINE (C1–C6 keep theirs in test/rr180-r4b.test.mjs); each C7 FAILURE limb has its sabotage in
 * test/helpers/rr186-sabotage.mjs. FIXTURE STRUCTURES ONLY (RR-177): planning rows by F91's and F16's own functions, drafts by F37's own
 * render, judged by F40's UNCHANGED judgements. Nothing here writes to the production trail.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { renderCompiledDraft } from "../src/page/draft-render.mjs";
import { judgeDraft, CRITERIA, METHOD_SOURCE, VERDICT, POPULATION } from "../src/page/quality-judgements.mjs";
import { assessPage, STATE as MARKUP } from "../src/page/structured-data.mjs";
import { decideGroupedNeeds } from "../src/page/action-evidence.mjs";
import { connectQuestions, coverageRecords, CONNECTION } from "../src/page/demand-connection.mjs";
import { coverageJudgementRecords } from "../src/page/grouped-need-coverage.mjs";
import { possibleCombinations } from "../src/page/page-opportunities.mjs";
import { researchDerivedQuestion, assessmentRecord, ROUTES } from "../src/research/research-derived.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const sha = (s) => createHash("sha256").update(String(s).replace(/\r\n/g, "\n"), "utf8").digest("hex");
/* F40 as frozen and built at main 4ca0e5af — its criteria and its method file, pinned from those committed bytes (F40 is not reopened) */
const F40_CRITERIA_SHA = "6b734b4577090f6209368b56f3d98ab17adb5da8c070e3bd8aac6fd6c523827f";
/* RR-188: F40 Acceptance Amendment 1 adds contentSha256 to the record, so the module file changes; what stays byte-identical are its
 * criteria and its three judgement methods — the amendment's own pins */
const F40_METHOD_SHA = Object.freeze({ fillerJudgement: "1c3d18fffff3b61044847da264861dda26949d6f9192946b839cac32e4999af4", repetitionJudgement: "1b63ea813b1039cc375e1011f3c5548eee91a6a342ab8420ea4de413edc522e4", recordedJudgement: "3503fde206ade00d8848b34195b1f702f26929317d069872d14b7f578f05483e" });
const ON = "2026-10-06", AT = `${ON}T00:00:00Z`, NOW = new Date(`${ON}T12:00:00Z`);
const T = "tenant:rr186-fixture", S = "rr186-fixture-subject";

/* ---- fixture planning rows, by F91's and F16's own functions (the RR-180 fixture, renamed) ---- */
const POSSIBLE = possibleCombinations({ dimensions: [{ key: "axis", values: ["one", "two"], source: "the fixture descriptor", applicability: "APPLIES" }] });
const PRODUCT = Object.freeze({ productId: S, axis: { key: "axis" }, variants: ["one", "two"], pageSpecs: {} });
const relevant = (q) => assessmentRecord({ question: q, draft: { verdict: "RELEVANT", declarationVersion: "fixture-v1", meaningTest: "within the declared field", reason: "about the declared product", source: { kind: "METHOD", ref: "fixture-method" } }, at: AT }).record;
const rd = (queryId, wording) => researchDerivedQuestion({ subject: S, queryId, route: ROUTES.CLIENT_AI, wording, providerId: "fixture-provider", at: AT });
const observed = (id, wording) => ({ record_type: "public_question", question_id: id, measurement_key: `public_question:${id}`, recorded_at: "2026-10-01T09:00:00Z",
  value: { subject: S, kind: "OBSERVED", original: wording, sourceId: "fixture", provenance: { observerType: "SOURCE_ADAPTER_OBSERVED", seenBy: "A SOURCE ADAPTER — the text as the source holds it" } } });
const related = (name, path) => ({ kind: "RELATED", name, link: `https://related.fixture.invalid/${path}`, readOn: "2026-10-02" });
const CENTRAL = { claimId: "c-central", states: "OTHER", text: "A fixture licence renewal takes about four weeks.", source: related("a related fixture source", "a"), supports: { finding: "SUPPORTS", ref: "finding:central" } };
const BODY = { claimId: "c-body", central: false, states: "RESPONSIBLE_BODY_RULE", body: "Fixture Licensing Board", text: "The Fixture Licensing Board requires the renewal form.", source: { kind: "RESPONSIBLE_BODY", body: "Fixture Licensing Board", name: "Fixture Licensing Board", link: "https://board.fixture.invalid/renewal", readOn: "2026-10-02" }, supports: { finding: "SUPPORTS", ref: "finding:body" } };
const UNSUPPORTED = { claimId: "c-unknown", central: false, states: "OTHER", text: "The renewal fee is lower this year.", source: related("another fixture source", "b"), supports: { finding: "DOES_NOT_SUPPORT", ref: "finding:unknown" } };
const Q1 = rd("formed-1", "How long does a fixture licence renewal take?");
const Q2 = observed("obs-2", "How long is the renewal of a fixture licence?");
const Q3 = rd("formed-3", "What do people often ask about fixture licence renewals?");
const page = (id, h1) => ({ pageId: id, tenantId: T, html: `<article><h1>${h1}</h1><p>Fixture body text about ${h1.toLowerCase()} and nothing else of the subject.</p></article>`, bodyObservationId: `obs:${id}` });
const PAGES = [page("fixture-page-a", "Fixture opening hours"), page("fixture-page-b", "Fixture contact details")];
const POP = { tenantId: T, coverageState: "COMPLETE", pages: PAGES, inventory: { pages: PAGES.map((p) => ({ pageId: p.pageId, fingerprints: [{ observationId: p.bodyObservationId, verified: true }] })) } };
/* 🔴 RR-208 (F37 Acceptance Amendment 2, C8): the draft reads its links and URL ONLY from F94's plan for its need. FIXTURE RESTATE ONLY — the same
 * targets as the earlier `links` fixture (page a out, page b in, the same URL), now in F94's plan shape for the chosen need; every assertion is unchanged. */
const PLAN_OF = (decision, over = {}) => Object.freeze({ feature: "F94", planned: true, subject: { kind: "NEW_PAGE", ref: `F35:CREATE:${decision?.subject?.needId}` },
  url: { state: "PROPOSED", url: "https://fixture-world.invalid/renewal", readFrom: ["fixture-page-a", "fixture-page-b"] },
  linksOut: [{ pageId: "fixture-page-a", url: "https://fixture-world.invalid/hours", reason: { kind: "SAME_NEED", ref: "F33:COVERS:fixture-page-a" }, extends: [], targetStatus: "WORKING" }],
  linksIn: [{ pageId: "fixture-page-b", url: "https://fixture-world.invalid/contact", reason: { kind: "SAME_NEED", ref: "F33:COVERS:fixture-page-b" }, extends: [], targetStatus: "NOT MEASURED" }],
  bound: { state: "COMPLETE", text: "the fixture inventory (RR-177)", counts: null }, complete: true, claims: { urlUnique: true }, ...over });
function chosen(grouped) {
  const qs = grouped ? [Q1, Q2, Q3] : [Q1];
  const same = (q) => ({ questionId: Q1.question_id, judgementRef: `same:${q.question_id}`, reason: "the same meaning and need" });
  const conn = connectQuestions({ subject: S, possible: POSSIBLE, records: qs, assessments: (grouped ? [Q1, Q3] : [Q1]).map(relevant), on: ON, drafts: [
    { questionId: Q1.question_id, combination: { axis: "one" }, answer: { claims: [CENTRAL, BODY, UNSUPPORTED] } },
    ...(grouped ? [{ questionId: Q2.question_id, combination: { axis: "one" }, sameAs: same(Q2) }, { questionId: Q3.question_id, combination: { axis: "one" }, sameAs: same(Q3) }] : []),
  ] });
  assert.deepEqual(conn.refused, []);
  const judgements = coverageJudgementRecords(qs.flatMap((q) => PAGES.map((p) => ({ questionId: q.question_id, pageId: p.pageId, verdict: "DOES_NOT_COVER", reason: "the page's sections compared with the question", source: { kind: "METHOD", ref: "fixture-coverage-method" } }))), { on: ON }).records;
  const rows = [...conn.records, ...coverageRecords({ subject: S, rows: conn.records, tenantId: T, population: POP, judgements, on: ON })];
  const needId = rows.find((r) => r.record_type === CONNECTION).needId;
  const g = decideGroupedNeeds({ tenantId: T, product: PRODUCT, population: POP, planningRows: rows, duplicationReviews: PAGES.map((p) => ({ needId, against: p.pageId, verdict: "DISTINCT", needsGuidance: false, ref: `review:${p.pageId}` })) });
  assert.equal(g.compiled.forConstruction.length, 1, "F35 did not choose the fixture need");
  return { g, d: g.compiled.forConstruction[0] };
}
/** F37 C7's own reading of a draft: each distinct claim once, every refer-back resolving to a rendered claim, no new visible text */
function claimsOnce(html, spec) {
  const ids = [...html.matchAll(/<div class="claim" data-claim-id="([^"]+)">/g)].map((m) => m[1]);
  const refs = [...html.matchAll(/<section class="qa"[^>]* data-refers-to="([^"]*)">\n<h2><a href="#answer">([^<]*)<\/a><\/h2>/g)];
  const sectionText = [...html.matchAll(/<section class="qa"[^>]*>([\s\S]*?)<\/section>/g)].map((m) => m[1].replace(/<p class="unknown"[\s\S]*?<\/p>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  return {
    once: ids.length === new Set(ids).size, blocks: ids.length, distinct: new Set(ids).size,
    answerAnchor: (html.match(/ id="answer"/g) ?? []).length === 1,
    everyHeadingLinksBack: refs.length === spec.sections.length && refs.every((m, i) => m[2] === spec.sections[i].heading.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")),
    refersResolve: refs.every((m) => m[1].split(" ").filter(Boolean).every((id) => ids.includes(id))),
    noNewVisibleText: sectionText.every((t, i) => t === `${spec.sections[i].heading} ${(/<p class="qa-tier">([^<]*)<\/p>/.exec([...html.matchAll(/<section class="qa"[^>]*>([\s\S]*?)<\/section>/g)][i][1]) ?? [])[1]}`),
  };
}

test("the production trail was not written by this file", () => assert.equal(trailSha(), TRAIL_BEFORE));
