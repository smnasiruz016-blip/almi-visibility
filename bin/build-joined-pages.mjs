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
 * inside the recorded claim it names), built-page-needs.jsonl (when present: F10's stored decisions about the built pages) and conversion-rates.json (a dated, sourced exchange-rate fact for a recorded price; stale rates are not shown). The page is built under the owner's standing PAGE LAW (RR-255, src/page/joined-page.mjs): it wears
 * the client's own design, read from the client's questionnaire.
 *
 * In one governed run, from stored records only (nothing fetched):
 *   1  the proposed pages (page-drafts.json): each a page candidate with its needs, their admitted questions and each need's answer claims;
 *   2  F10'S STORED DECISIONS are read and honoured (src/page/stored-page-decisions.mjs; F10 Acceptance Amendment 4 is the one rule, and
 *      it is applied by bin/built-page-needs.mjs over BUILT pages — nothing is decided here): a page a stored cancellation names is not
 *      proposed, so it is never rebuilt; the questions its stored moves carried stand in the survivor's question-and-answer section;
 *      a pair stored as REVIEW or CANNOT DECIDE is built as it is and listed;
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
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore, lookupSubject } from "../src/tenancy/root-registry.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { ensureSubjectHook } from "../src/subject-roots.mjs";
import { barredSources, claimsQuotingBarred } from "../src/facts/licence-guard.mjs";
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
import { connectionDrafts, productStatements, joinPages, valueOf, needsToRestate } from "../src/page/joined-page.mjs";
import { storedDecisions, proposedAfterDecisions, constructionAfterDecisions, withStoredMoves } from "../src/page/stored-page-decisions.mjs";
import { checkedNotFoundByNeed } from "../src/facts/checked-not-found.mjs";
import { linkGuard } from "../src/facts/link-guard.mjs";
import { privateSourcesRoot, withPrivateTexts } from "../src/facts/private-texts.mjs";

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
/* RR-264: a page's title may also be planned over THIS batch's STORED phrase records (F11, search-phrases.jsonl), each named by its source and
 * wording in title-plans.json: the words are the stored record's, never the plan's, and a plan that names no stored phrase refuses the run
 * before anything is written */
const storedPhrases = rowsOf("search-phrases.jsonl").filter((r) => r?.record_type === "search_phrase");
const titlePlans = Array.isArray(json("title-plans.json")) ? json("title-plans.json") : [];
const planned = titlePlans.map((t) => { const r = storedPhrases.find((x) => x.source === t?.source && x.phrase === t?.phrase); return r ? { phraseId: r.phrase_id, page: t.page, text: r.phrase, label: r.label, source: r.source, ...Object.fromEntries(["role", "use", "need", "withYear", "promisesConversionTo"].filter((k) => t[k] !== undefined).map((k) => [k, t[k]])) } : null; });
if (planned.includes(null)) { console.error(`🔴 REFUSED — TITLE_PLAN_NAMES_NO_STORED_PHRASE: ${planned.filter((p) => p === null).length} title plan(s) name no phrase stored in this batch; nothing written`); process.exit(3); }
/* RR-269 §3: what was CHECKED and NOT FOUND (an absence is not a fact), by need key — a filed record that breaks its rules refuses the run
 * before anything is written */
const cnf = checkedNotFoundByNeed(Array.isArray(json("checked-not-found.json")) ? json("checked-not-found.json") : []);
if (cnf.refused.length) { console.error(`🔴 REFUSED — CHECKED_NOT_FOUND_RECORD_REFUSED: ${cnf.refused.map((r) => `${r.id ?? "(no id)"} ${r.reasons.join("+")}`).join(" · ")}; nothing written`); process.exit(3); }
/* 🔴 RR-281 · THE LINK GUARD (src/facts/link-guard.mjs): every claim's fact is rechecked at the link the page shows, and its quotation is in a
 * stored text of that link — else the run refuses before anything is written. The texts are this batch's own stored reads, joined to their
 * private texts (RR-274) at this batch's own path under the private sources root; without that root no text is there, and the guard refuses. */
const PRIVATE = privateSourcesRoot(process.env);
/* bound on a line that names the RESEARCH store: these are THIS research batch's own texts, decided by RESOURCES.researchBatch above */
const privateBatchDir = join(PRIVATE.dir, relative(lookupStore(index, "RESEARCH").rootPath, batchDir));
const privateRows = (f) => { try { return readFileSync(join(privateBatchDir, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
const registries = readdirSync(batchDir).filter((f) => /^facts-registry-\d{4}-\d{2}-\d{2}\.json$/.test(f));
if (registries.length > 1) { console.error(`🔴 REFUSED — FACT_REGISTRY_AMBIGUOUS: the batch files ${registries.length} fact registries; nothing written`); process.exit(3); }
/* RR-288 (owner decision 1): the sources whose own records say their licence forbids storing their words — a claim quoting one is REFUSED
 * (src/facts/licence-guard.mjs R4); a claim citing one stands on its link alone (the link guard, never against words the engine may not keep) */
const subjectRoot = lookupSubject(index, SUBJECT);
ensureSubjectHook(); /* the registry modules import the engine's own record helpers, as productFromArgv lets them */
const BARRED = subjectRoot.state === "DECLARED" && existsSync(join(subjectRoot.dir, "facts")) ? barredSources((await loadRegistry(join(subjectRoot.dir, "facts"), SUBJECT)).records) : new Set();
const quoting = claimsQuotingBarred((proposed.pages ?? []).flatMap((p) => (p.needs ?? []).flatMap((n) => n.answer?.claims ?? [])), BARRED);
if (quoting.refused.length) { console.error(`🔴 REFUSED — ${quoting.refused.length} claim(s) quote a source whose licence forbids storing its words (${quoting.refused.slice(0, 10).map((r) => r.claimId).join(", ")}); nothing written`); process.exit(3); }
const guard = linkGuard({ barred: BARRED, drafts: proposed, findings: Array.isArray(json("findings.json")) ? json("findings.json") : [], registry: registries.length ? json(registries[0]) ?? { facts: [] } : { facts: [] },
  intervals: Array.isArray(json("recheck-intervals.json")) ? json("recheck-intervals.json") : [], reads: withPrivateTexts(rowsOf("source-reads.jsonl"), privateRows("source-reads.jsonl"), { privateRoot: PRIVATE.state }) });
if (guard.refused.length) {
  const by = Object.entries(Object.groupBy(guard.refused, (r) => r.code)).map(([k, v]) => `${k} ${v.length}`).join(" · ");
  console.error(`🔴 REFUSED — LINK_GUARD: ${guard.refused.length} of ${guard.claims} claim(s) (${by}) cite a fact through a link it was not verified at${PRIVATE.state === "DECLARED" ? "" : " (the private sources root is not here, so no stored text is)"}; nothing written`);
  for (const r of guard.refused.slice(0, 20)) console.error(`    ${r.code}  ${r.page} · ${r.claimId} · fact ${r.factId ?? "(none)"} · page link ${r.pageLink}${r.code === "LINK_DIFFERS" ? ` · rechecked at ${r.factLink}` : ` · stored texts of that link ${r.storedTexts}`}`);
  process.exit(3);
}

console.log(`JOINED TEST PAGES — ${X.stamp} · this subject's product only, from stored records; nothing fetched`);
console.log(`  link guard       ${guard.claims} claim(s): each rechecked at the link its page shows, its quotation in a stored text of that link (RR-281); ${guard.linkOnly.length} on a licence-barred link checked by link only, none quoting it (RR-288)`);
console.log(`  exception        ${X.exception.effect} · owner record ${X.exception.record.repo}:${X.exception.record.path}@${X.exception.record.commit.slice(0, 7)} · the declared page specs are set aside with them`);

/* 2 · F10's stored decisions (Acceptance Amendment 4) — read, honoured, never made here */
const decided = storedDecisions({ records: rowsOf("built-page-needs.jsonl"), tenantId: SCOPE.tenantId });
const resolved = proposedAfterDecisions({ pages: proposed.pages, decisions: decided });
console.log(`  proposed         ${proposed.pages.length} page(s), ${proposed.pages.reduce((n, p) => n + p.needs.length, 0)} need(s)`);
console.log(`  stored decisions cancelled page(s) not rebuilt ${resolved.notBuilt.length} of ${proposed.pages.length} proposed · stored moves ${decided.moves.length} · pair(s) listed for the owner ${decided.listed.length} (built as they are) · page(s) to build ${resolved.pages.length}`);
for (const x of resolved.notBuilt) console.log(`    not rebuilt    ${x.page} — cancelled by a stored decision (survivor ${x.survivorPage}, step ${x.decidedByStep})`);
for (const x of decided.listed) console.log(`    listed         ${x.pages.join(" | ")} — ${x.as}: ${x.why ?? "no reason recorded"}`);

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
/* a recorded review names needs by key whether or not their page is built: the planning store still holds a cancelled page's needs, and
 * F35 decides every stored need as before */
const reviewKeyToNeed = new Map(proposed.pages.flatMap((p) => p.needs.map((n) => [n.key, needOf.get(n.questions[0]) ?? null])));

/* 5 · F35, unchanged, with the recorded reviews (by need key → need id) */
const duplicationReviews = reviewsIn.map((r) => ({ needId: reviewKeyToNeed.get(r.need) ?? null, against: reviewKeyToNeed.get(r.against) ?? null, verdict: r.verdict, needsGuidance: r.needsGuidance, ref: r.ref })).filter((r) => r.needId && r.against);
/* F36 (S38): the recorded substance reviews of two overlapping reasons, by need key → the compiled slugs F36 compares; none filed is [] */
const rationaleIn = json("rationale-reviews.json") ?? [];
const rationaleReviews = (Array.isArray(rationaleIn) ? rationaleIn : []).map((r) => ({ pair: (r.needs ?? []).map((k) => (reviewKeyToNeed.get(k) ? compiledSlug(reviewKeyToNeed.get(k)) : null)), verdict: r.verdict, ref: r.ref, source: r.source })).filter((r) => r.pair.length === 2 && r.pair.every(Boolean));
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
const phrases = [...list("search-phrases.json"), ...planned], keyFacts = list("key-facts.json"), rates = list("conversion-rates.json"), comparisons = list("comparisons.json"), intervals = new Map(list("recheck-intervals.json").map((r) => [r?.claimId, r?.recheckDays]));
console.log(`  page law inputs  client design ${design ? `filed (${design.basis})` : "NOT FILED"} · recorded search phrases ${phrases.length} · recorded key facts ${keyFacts.length} · recorded conversions ${rates.length} · recorded comparison tables ${comparisons.length} · recorded recheck intervals ${intervals.size}`);
const needToKey = new Map([...keyToNeed].map(([k, v]) => [v, k]));
/* RR-262: what a need is recorded to lead with (the owner's page-content decision), by need key */
const leadOfKey = new Map(resolved.pages.flatMap((p) => p.needs.filter((n) => n.lead !== undefined && n.lead !== null).map((n) => [n.key, n.lead])));
/* RR-265: the client's DECLARED filler phrases (to the point) — none filed is none */
const fillerPhrases = list("page-filler-phrases.json");
/* RR-265: a need's recorded general view (GENERAL_VIEW, INFERRED), by need key */
const generalViewOfKey = new Map(resolved.pages.flatMap((p) => p.needs.filter((n) => n.generalView).map((n) => [n.key, n.generalView])));
const helpOf = new Map(resolved.pages.flatMap((p) => p.needs.map((n) => [n.key, n.productAnswers ?? []])));
const questions = new Map(stored.filter((r) => r?.record_type === CONNECTION).map((r) => [r.questionId, r]));
/* the place of each need on its page is the order the page's needs were handed in; a need F35 did not choose is reported, never written */
const order = new Map(resolved.pages.flatMap((p) => p.needs.map((n, i) => [keyToNeed.get(n.key), i])));
/* no need the planning store still holds for a cancelled page is joined: the page is never rebuilt */
const joinable = constructionAfterDecisions({ construction: G.compiled.forConstruction, decisions: decided });
if (joinable.heldBack) console.log(`  stored decisions ${joinable.heldBack} compiled need(s) of cancelled page(s) held back from the join`);
const chosen = new Set(joinable.construction.map((c) => c.spec?.subject));
const whyNot = new Map(G.groupedNeeds.filter((d) => d.decision !== "CHOSEN").map((d) => [d.subject.needId, (d.missing ?? []).join(" | ")]));
const unanswered = new Map(resolved.pages.map((p) => [valueOf(p.combination), p.needs.filter((n) => !chosen.has(keyToNeed.get(n.key))).map((n) => Object.freeze({ need: n.key, questions: n.questions.length, wordings: Object.freeze(n.questions.map((q) => questions.get(q)?.wording).filter(Boolean)), why: whyNot.get(keyToNeed.get(n.key)) ?? "not connected",
  /* RR-268 A2: a need's recorded UNANSWERABLE disposition (the official source checked and the day), carried as filed — the page gate decides */
  ...(n.unanswerable ? { unanswerable: Object.freeze({ ...n.unanswerable }) } : {}) }))]));
/* RR-286: the batch's filed internal-link plan, when it files one (the latest internal-links-<day>.json): for each page value, its links */
const linkPlanFile = readdirSync(batchDir).filter((f) => /^internal-links-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().at(-1) ?? null;
const linkPlan = linkPlanFile ? JSON.parse(readFileSync(join(batchDir, linkPlanFile), "utf8")).pages ?? {} : {};
if (linkPlanFile) console.log(`  link plan        ${linkPlanFile}: ${Object.keys(linkPlan).length} page(s)`);
const pages = joinPages({ construction: joinable.construction, questions, stamp: X.stamp, relatedFor: (value) => (Array.isArray(linkPlan[value]) ? linkPlan[value] : []), orderOf: (needId) => order.get(needId) ?? 0, unansweredFor: (value) => unanswered.get(value) ?? [],
  design, productLine: design?.productLine ?? null, needKeyOf: (needId) => needToKey.get(needId) ?? needId, leadOf: (needId) => leadOfKey.get(needToKey.get(needId)) ?? null, generalViewOf: (needId) => generalViewOfKey.get(needToKey.get(needId)) ?? null, checkedNotFoundOf: (needId) => cnf.byNeed.get(needToKey.get(needId)) ?? [], fillerPhrases,
  phrasesFor: (value) => phrases.filter((p) => p?.page === value), keyFactsFor: (value) => keyFacts.filter((k) => k?.page === value), ratesFor: (value) => rates.filter((r) => r?.page === value), comparisonsFor: (value) => comparisons.filter((t) => t?.page === value), recheckOf: (claimId) => intervals.get(claimId) ?? null, on: ON,
  renderNeed: ({ spec, decision }) => renderCompiledDraft({ spec, decision, plan: null }),
  statementsFor: (needId) => productStatements({ answerIds: helpOf.get(needToKey.get(needId)) ?? [], approved, officialSite: officialSites[0] ?? null, productName: proposed.productName ?? null }) });
/* the stored moves of a cancelled page stand in the survivor after every rebuild */
const built = pages.map((p) => withStoredMoves({ page: p, decisions: decided }));
for (const { record: p, ...m } of built) {
  if (m.moved) console.log(`  page ${p.value} — stored moves ${m.moved}: already on the rebuilt page ${m.alreadyHeld} · placed ${m.placed} · with no item on the rebuilt page ${m.noItem} (kept in the stored record only)`);
  const states = Object.entries(p.checks).map(([k, v]) => `${k} ${v.state}`);
  const n = (s) => Object.values(p.checks).filter((v) => v.state === s).length;
  console.log(`  page ${p.value} — ${p.items} item(s), ${p.questions} question(s), FAQ ${p.faqCount}, key facts ${p.keyFacts.length}, ${p.wordCount} word(s) · title ${p.titleComposed ? "COMPOSED from search phrases" : "from recorded questions (no search phrase recorded)"} · unanswered need(s) ${p.unanswered.length}${p.unanswerable ? ` (UNANSWERABLE with source and day ${p.unanswerable})` : ""} · gates PASS ${n("PASS")} · FAIL ${n("FAIL")} · NOT MEASURED ${n("NOT MEASURED")}`);
  console.log(`    ${states.join(" · ")}`);
}
/* RR-265: a general view that is not labelled where it stands (or breaks its other rules) fails the build — no page is written */
const unlabelled = built.filter(({ record: p }) => p.checks.generalViewLabelled?.state === "FAIL").map(({ record: p }) => p.value);
const views = built.reduce((n, { record: p }) => n + (p.generalViews ?? 0), 0);
console.log(`  general views    ${views} (GENERAL_VIEW, INFERRED — counted apart from sourced answers, never in the FAQ data) on ${built.filter(({ record: p }) => p.generalViews).length} page(s)`);
/* RR-265: an answer that is not to the point fails the build, named — no page is written */
const pointless = built.filter(({ record: p }) => p.checks.toThePoint?.state === "FAIL").map(({ record: p }) => `${p.value}: ${p.checks.toThePoint.why}`);
if (pointless.length) { console.error(`🔴 REFUSED — NOT_TO_THE_POINT: ${pointless.join(" | ")}; no page written`); process.exit(3); }
if (unlabelled.length) { console.error(`🔴 REFUSED — GENERAL_VIEW_NOT_LABELLED: ${unlabelled.length} page(s) hold a general view that breaks its rules; no page written`); process.exit(3); }
/* RR-269 §3: a checked-not-found line not shown with its checked pages, or found in the FAQ data, fails the build — no page is written */
const cnfLines = built.reduce((n, { record: p }) => n + p.itemList.reduce((m, it) => m + (it.checkedNotFound?.length ?? 0), 0), 0);
console.log(`  checked, not found ${cnfLines} line(s) (CHECKED_NOT_FOUND — not facts, never in the FAQ data) on ${built.filter(({ record: p }) => p.checks.checkedNotFoundShown?.state === "PASS").length} page(s)`);
const cnfBad = built.filter(({ record: p }) => p.checks.checkedNotFoundShown?.state === "FAIL").map(({ record: p }) => p.value);
if (cnfBad.length) { console.error(`🔴 REFUSED — CHECKED_NOT_FOUND_NOT_SHOWN: ${cnfBad.join(", ")}; no page written`); process.exit(3); }
const out = built.map(({ record: p }) => ({ ...p, recorded_at: `${ON}T00:00:00Z`, subject: SUBJECT, exception: X.exception }));
if (out.length) { const g = append(out, join(batchDir, "joined-pages.jsonl"), "APPEND_JOINED_TEST_PAGES"); if (!kept(g)) { console.error(`  🔴 ${g.outcome} — the pages did NOT persist`); process.exit(1); } console.log(`  kept             ${pages.length} page draft(s) in the batch's joined-pages store (${g.outcome}) — ${X.stamp}`); }
process.exit(pages.length > 0 ? 0 : 2);
