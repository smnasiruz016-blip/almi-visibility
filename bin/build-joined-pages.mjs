#!/usr/bin/env node
/**
 * 🔴 THE JOINED TEST PAGES — one page per value of the product's declared dimension, every chosen need on it with its own answer
 * (the owner's page shape, RR-253; Specification Amendment 6). NOTHING IS PUBLISHED: no route, no sitemap entry, no deploy, no
 * production write. The pages are written ONLY into the named research batch of the RESEARCH store (the private data root).
 *
 *   node bin/build-joined-pages.mjs --subject=<id> --product=<id> --research-batch=<id> --on=YYYY-MM-DD
 *        --test-exception=<repo>:<path>@<commit> [--confirm]
 *
 * Its inputs are read from the batch itself, by fixed name (as bin/research-derived-intake.mjs reads its own): page-drafts.json, reviews.json
 * and, where filed, rationale-reviews.json (the recorded substance reviews F36 asks for when two items' reasons overlap, by need key),
 * search-phrases.json (the recorded search phrases a title may be composed from — the title law) and key-facts.json (recorded values, each
 * inside the recorded claim it names) and conversion-rates.json (a dated, sourced exchange-rate fact for a recorded price; stale rates are not shown). The page is built under the owner's standing PAGE LAW (RR-255, src/page/joined-page.mjs): it wears
 * the client's own design, read from the client's questionnaire.
 *
 * In one governed run, from stored records only (nothing fetched):
 *   1  the proposed pages (page-drafts.json): each a page candidate with its needs, their admitted questions and each need's answer claims;
 *   2  CANCEL AND MOVE (src/page/joined-page.mjs cancelSamePages), as the owner clarified Specification Amendment 6 (RR-254): only two
 *      WHOLE pages serving the same need, by RECORDED judgements → one page is cancelled and its questions move into the survivor's items.
 *      A question shared by two pages stays on each; it is counted, never cancelled;
 *   3  the connections (F91, src/page/demand-connection.mjs connectQuestions — the same function bin/demand-connect.mjs uses), appended to
 *      the batch's planning store through the governed boundary. No coverage record is written here: that is bin/demand-connect.mjs's,
 *      over the tenant's REAL pages;
 *   4  🔴 the ONE-TIME TEST EXCEPTION (src/page/test-exception.mjs), required: the existing pages are treated as not existing, supplied
 *      from OUTSIDE F33/F34/F35, whose functions are called unchanged. The product's hand-declared page specs are set aside with them: the
 *      page is compiled from the batch's questions. The coverage records it yields live in memory only and are never stored;
 *   5  F35 decides every need (decideGroupedNeeds); only a need it CHOSE to CREATE is joined (reviews.json: the recorded non-duplicate
 *      reviews it requires, by need key — a method's or an agent's, never an approval);
 *   6  each page is rendered — its title and headings chosen from the recorded questions, observed first (RR-254) — with its gate table
 *      and the needs it could not answer, and appended to the batch's joined-pages.jsonl. A joined page is a DRAFT, never ACCEPTED.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore, lookupSubject } from "../src/tenancy/root-registry.mjs";
import { writePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { productFromArgvOrExit } from "../src/product-cli.mjs";
import { readProductPlan } from "../src/page/page-opportunities-reader.mjs";
import { connectQuestions, coverageRecords, CONNECTION, NEED } from "../src/page/demand-connection.mjs";
import { answerSupport } from "../src/page/answer-support.mjs";
import { decideGroupedNeeds } from "../src/page/action-evidence.mjs";
import { renderCompiledDraft } from "../src/page/draft-render.mjs";
import { compiledSlug } from "../src/page/spec-compiler.mjs";
import { RESEARCH_DERIVED_RECORD, ASSESSMENT_RECORD } from "../src/research/research-derived.mjs";
import { overturnedIds } from "../src/research/meaning-judgement.mjs";
import { readProductQuestionnaire } from "../src/questionnaire/product-questionnaire-reader.mjs";
import { designOf } from "../src/questionnaire/product-questionnaire.mjs";
import { testException, parseExceptionRecord } from "../src/page/test-exception.mjs";
import { cancelSamePages, samePagePairs, connectionDrafts, productStatements, joinPages, valueOf, needsToRestate } from "../src/page/joined-page.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch"), ON = arg("on");
const EXCEPTION = parseExceptionRecord(arg("test-exception"));
if (!SUBJECT || !BATCH || !ON) { console.error("usage: node bin/build-joined-pages.mjs --subject=<id> --product=<id> --research-batch=<id> --on=YYYY-MM-DD --test-exception=<repo>:<path>@<commit> [--confirm] — nothing read, nothing written"); process.exit(2); }
if (!EXCEPTION) { console.error("🔴 REFUSED — TEST_EXCEPTION_WITHOUT_ITS_COMMITTED_OWNER_RECORD: this entry point builds test pages only, under the owner's recorded one-time exception (<repo>:<path>@<40-hex commit>); nothing read, nothing written"); process.exit(2); }
const SCOPE = scopedEntryPoint({ entry: "bin/build-joined-pages.mjs", governed: true, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH),
  ...(arg("product") && arg("product") !== SUBJECT ? [RESOURCES.subject(arg("product"))] : [])] });

const index = rootIndexFor(process.env);
const store = lookupStore(index, "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}`); process.exit(3); }
/* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store’s (tenant-scope census) */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
if (!existsSync(batchDir)) { console.error("🔴 REFUSED — RESEARCH_BATCH_ABSENT: the declared research batch has no directory in the RESEARCH store"); process.exit(3); }
const product = await productFromArgvOrExit(process.argv, { usage: "--product=<id>", scope: SCOPE });
const members = lookupSubject(index, SUBJECT).entry?.members ?? [];
if (!members.some((m) => m.resourceKind === "FACT_REGISTRY" && String(m.resourceRef).split(":").pop().split("/")[0] === product?.productId)) { console.error("🔴 REFUSED — PRODUCT_IS_NOT_THIS_SUBJECTS: the subject does not declare this product's fact registry; nothing written"); process.exit(3); }

const X = testException({ tenantId: SCOPE.tenantId, record: EXCEPTION });
const rowsOf = (f) => (existsSync(join(batchDir, f)) ? createJsonlStore(join(batchDir, f)).readAll() : []);
const records = ["questions.jsonl", "leads.jsonl", "keyword-signals.jsonl"].flatMap(rowsOf);
records.push(...rowsOf("research-derived-questions.jsonl").filter((r) => r?.record_type === RESEARCH_DERIVED_RECORD));
const assessments = rowsOf("relevance-assessments.jsonl").filter((r) => r?.record_type === ASSESSMENT_RECORD);
const overturned = overturnedIds(rowsOf("meaning-judgements.jsonl"));
/* every read below is of THIS batch, inside the RESEARCH store the gate decided */
const json = (f) => { try { return JSON.parse(readFileSync(join(batchDir, f), "utf8")); } catch { return null; } };
const proposed = json("page-drafts.json"), reviewsIn = json("reviews.json");
if (!Array.isArray(proposed?.pages) || !Array.isArray(reviewsIn)) { console.error("🔴 REFUSED — INTAKE_FILE_UNREADABLE: page-drafts.json or reviews.json is not readable in the batch; nothing written"); process.exit(3); }
const { plan } = await readProductPlan(product);
const officialSites = Array.isArray(product.officialSites) ? product.officialSites : [];

console.log(`JOINED TEST PAGES — ${X.stamp} · this subject's product only, from stored records; nothing fetched`);
console.log(`  exception        ${X.exception.effect} · owner record ${X.exception.record.repo}:${X.exception.record.path}@${X.exception.record.commit.slice(0, 7)} · the declared page specs are set aside with them`);

/* 2 · Specification Amendment 6 */
const resolved = cancelSamePages(proposed);
const left = samePagePairs({ pages: resolved.pages, sameNeed: proposed.sameNeed ?? [] });
console.log(`  proposed         ${proposed.pages.length} page(s), ${proposed.pages.reduce((n, p) => n + p.needs.length, 0)} need(s) · same-need judgements ${(proposed.sameNeed ?? []).length}`);
console.log(`  cancel and move  whole page(s) cancelled ${resolved.cancelledPages.length} (${resolved.cancellations.reduce((n, c) => n + c.movedQuestions.length, 0)} question(s) moved) · shared question(s) kept on each page ${resolved.shared.length} · refused ${resolved.refused.length} · same-need page pairs left ${left.length}`);

/* 3 · the connections, through F91's own function */
const file = join(batchDir, "planning.jsonl");
const held = () => rowsOf("planning.jsonl");
const c = connectQuestions({ subject: SUBJECT, possible: plan.possible, records, drafts: connectionDrafts(resolved), existing: held(), officialSites, on: ON, overturned, assessments });
const codes = c.refused.reduce((m, x) => ((m[x.code] = (m[x.code] ?? 0) + 1), m), {});
console.log(`  connections      ${c.records.filter((x) => x.record_type === CONNECTION).length} new · refused ${c.refused.length}${c.refused.length ? ` (${Object.entries(codes).map(([k, n]) => `${k} ${n}`).join(" · ")})` : ""}`);
const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
const instant = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const append = (recs, target, action) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(target), records: recs,
  targetClass: "GENERATED_CONFIG", action, occurredAt: instant, correlationId: `run:build-joined-pages:${instant}`, discipline: "APPEND_IF_NEW" }));
const kept = (g) => g.outcome === "COMMITTED" || g.outcome === "ALREADY_COMMITTED";
if (!permission.mayWrite) { console.log("  NOT WRITTEN — no --confirm: nothing kept, nothing built"); process.exit(0); }
if (c.records.length) { const g = append(c.records, file, "APPEND_PLANNING_DEMAND"); if (!kept(g)) { console.error(`  🔴 ${g.outcome} — the connections did NOT persist`); process.exit(1); } }

/* RR-256: a need whose latest stored record lost its draft's answer is restated — F91's own record, F91's own answer rule, appended */
{
  const now = held();
  const needNow = new Map(now.filter((r) => r?.record_type === CONNECTION).map((r) => [r.questionId, r.needId]));
  const restate = needsToRestate({ pages: resolved.pages, stored: now, keyToNeed: new Map(resolved.pages.flatMap((p) => p.needs.map((n) => [n.key, needNow.get(n.questions[0]) ?? null]))), judge: (a) => answerSupport(a, { officialSites }), subject: SUBJECT, on: ON, recordType: NEED });
  console.log(`  needs restated   ${restate.length} (a need's stored record without its draft's answer)`);
  if (restate.length) { const g = append(restate, file, "APPEND_PLANNING_DEMAND"); if (!kept(g)) { console.error(`  🔴 ${g.outcome} — the restated needs did NOT persist`); process.exit(1); } }
}
/* 4 · the exception's coverage, in memory only — never stored */
const stored = held();
const overlay = coverageRecords({ subject: SUBJECT, rows: stored, tenantId: SCOPE.tenantId, population: X.population, judgements: [], on: ON, overturned });
const planningRows = [...stored, ...overlay];
const needOf = new Map(stored.filter((r) => r?.record_type === CONNECTION).map((r) => [r.questionId, r.needId]));
const keyToNeed = new Map(resolved.pages.flatMap((p) => p.needs.map((n) => [n.key, needOf.get(n.questions[0]) ?? null])));

/* 5 · F35, unchanged, with the recorded reviews (by need key → need id) */
const duplicationReviews = reviewsIn.map((r) => ({ needId: keyToNeed.get(r.need) ?? null, against: keyToNeed.get(r.against) ?? null, verdict: r.verdict, needsGuidance: r.needsGuidance, ref: r.ref })).filter((r) => r.needId && r.against);
/* F36 (S38): the recorded substance reviews of two overlapping reasons, by need key → the compiled slugs F36 compares; none filed is [] */
const rationaleIn = json("rationale-reviews.json") ?? [];
const rationaleReviews = (Array.isArray(rationaleIn) ? rationaleIn : []).map((r) => ({ pair: (r.needs ?? []).map((k) => (keyToNeed.get(k) ? compiledSlug(keyToNeed.get(k)) : null)), verdict: r.verdict, ref: r.ref, source: r.source })).filter((r) => r.pair.length === 2 && r.pair.every(Boolean));
const G = decideGroupedNeeds({ tenantId: SCOPE.tenantId, product: { ...product, pageSpecs: {} }, population: X.population, planningRows, overturned, duplicationReviews, rationaleReviews });
const byClass = G.groupedNeeds.reduce((m, d) => { const k = d.decision === "CHOSEN" ? (d.actions ?? []).map((a) => a.action).join("+") : `${d.class ?? d.decision}`; m[k] = (m[k] ?? 0) + 1; return m; }, {});
console.log(`  F35 decisions    ${G.groupedNeeds.length} need(s): ${Object.entries(byClass).map(([k, n]) => `${k} ${n}`).join(" · ") || "none"} · reviews read ${duplicationReviews.length} · rationale reviews read ${rationaleReviews.length} · compiled for construction ${G.compiled.forConstruction.length} · compile refusals ${G.compiled.refusals.length}`);
{ const keyOf = new Map([...keyToNeed].map(([k, v]) => [v, k])); for (const d of G.groupedNeeds.filter((x) => x.decision !== "CHOSEN")) console.log(`    not chosen     ${keyOf.get(d.subject.needId) ?? d.subject.needId} — ${(d.missing ?? []).join(" | ").slice(0, 180)}`); }

/* 6 · JOIN, render, gate table, write */
const filed = await readProductQuestionnaire(product);
const approved = filed.claims;
/* page law 1: the client's own design, as its questionnaire files it — none filed is none, never a default look */
const design = filed.state === "READ" ? designOf(filed.questionnaire) : null;
const list = (name) => { const v = json(name); return Array.isArray(v) ? v : []; };
const phrases = list("search-phrases.json"), keyFacts = list("key-facts.json"), rates = list("conversion-rates.json");
console.log(`  page law inputs  client design ${design ? `filed (${design.basis})` : "NOT FILED"} · recorded search phrases ${phrases.length} · recorded key facts ${keyFacts.length} · recorded conversion rates ${rates.length}`);
const needToKey = new Map([...keyToNeed].map(([k, v]) => [v, k]));
const helpOf = new Map(resolved.pages.flatMap((p) => p.needs.map((n) => [n.key, n.productAnswers ?? []])));
const questions = new Map(stored.filter((r) => r?.record_type === CONNECTION).map((r) => [r.questionId, r]));
/* the place of each need on its page is the order the page's needs were handed in; a need F35 did not choose is reported, never written */
const order = new Map(resolved.pages.flatMap((p) => p.needs.map((n, i) => [keyToNeed.get(n.key), i])));
const chosen = new Set(G.compiled.forConstruction.map((c) => c.spec?.subject));
const whyNot = new Map(G.groupedNeeds.filter((d) => d.decision !== "CHOSEN").map((d) => [d.subject.needId, (d.missing ?? []).join(" | ")]));
const unanswered = new Map(resolved.pages.map((p) => [valueOf(p.combination), p.needs.filter((n) => !chosen.has(keyToNeed.get(n.key))).map((n) => Object.freeze({ need: n.key, questions: n.questions.length, wordings: Object.freeze(n.questions.map((q) => questions.get(q)?.wording).filter(Boolean)), why: whyNot.get(keyToNeed.get(n.key)) ?? "not connected" }))]));
const pages = joinPages({ construction: G.compiled.forConstruction, questions, stamp: X.stamp, orderOf: (needId) => order.get(needId) ?? 0, unansweredFor: (value) => unanswered.get(value) ?? [],
  design, productLine: design?.productLine ?? null, needKeyOf: (needId) => needToKey.get(needId) ?? needId,
  phrasesFor: (value) => phrases.filter((p) => p?.page === value), keyFactsFor: (value) => keyFacts.filter((k) => k?.page === value), ratesFor: (value) => rates.filter((r) => r?.page === value), on: ON,
  renderNeed: ({ spec, decision }) => renderCompiledDraft({ spec, decision, plan: null }),
  statementsFor: (needId) => productStatements({ answerIds: helpOf.get(needToKey.get(needId)) ?? [], approved, officialSite: officialSites[0] ?? null, productName: proposed.productName ?? null }) });
for (const p of pages) {
  const states = Object.entries(p.checks).map(([k, v]) => `${k} ${v.state}`);
  const n = (s) => Object.values(p.checks).filter((v) => v.state === s).length;
  console.log(`  page ${p.value} — ${p.items} item(s), ${p.questions} question(s), FAQ ${p.faqCount}, key facts ${p.keyFacts.length}, ${p.wordCount} word(s) · title ${p.titleComposed ? "COMPOSED from search phrases" : "from recorded questions (no search phrase recorded)"} · unanswered need(s) ${p.unanswered.length} · gates PASS ${n("PASS")} · FAIL ${n("FAIL")} · NOT MEASURED ${n("NOT MEASURED")}`);
  console.log(`    ${states.join(" · ")}`);
}
const out = [...resolved.cancellations.map((x) => ({ ...x, measurement_key: `${x.record_type}:${x.cancelledPage}:${x.cancelledNeed}:${x.survivorNeed}`, recorded_at: `${ON}T00:00:00Z`, subject: SUBJECT, stamp: X.stamp })),
  ...pages.map((p) => ({ ...p, recorded_at: `${ON}T00:00:00Z`, subject: SUBJECT, exception: X.exception }))];
if (out.length) { const g = append(out, join(batchDir, "joined-pages.jsonl"), "APPEND_JOINED_TEST_PAGES"); if (!kept(g)) { console.error(`  🔴 ${g.outcome} — the pages did NOT persist`); process.exit(1); } console.log(`  kept             ${pages.length} page draft(s) and ${resolved.cancellations.length} cancellation record(s) in the batch's joined-pages store (${g.outcome}) — ${X.stamp}`); }
process.exit(pages.length > 0 ? 0 : 2);
