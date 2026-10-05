#!/usr/bin/env node
/**
 * F16 · C8–C14 · THE COLLECTION ENTRY POINT — the ONLY F16 path that may issue a request (Acceptance Amendment 1, _handoffs 45a1cbf).
 *
 *   node bin/collect-public-questions.mjs --tenant=<id> --actor=<id> --subject=<id> --research-batch=<id> --green=<authority id>
 *        --governance-root=<dir> --confirm
 *
 * The PLAN and the RELEVANCE PROFILE are DATA of the subject's own declared research batch — collection-plan.json and
 * relevance-profile.json in its directory — so the batch's tenant decision covers them; the GREEN names the plan's hash, and the plan names
 * the profile's.
 *
 * 🔴 THERE IS NO DRY RUN. Without --confirm nothing is read and no request is made. With it, the scope gate decides every resource for THIS
 * tenant first; then PREFLIGHT (src/research/collection.mjs) checks — before the first request — the declared subject, the exact bounded plan
 * for this subject, tenant and batch, the source's VALID owner-issued decision, its recorded terms, the credential BY PRESENCE ONLY and a
 * FRESH owner GREEN naming this exact plan. Any failure: no request, and the refusal is recorded in the batch's collection store.
 * Then ONE bounded run through the source's own collector (cap = the plan's request count), every hit kept as a LEAD apart, only questions
 * the existing boundary admits kept as observed public questions, the run record written FIRST (it spends the GREEN), counts only.
 *
 * 🔴 THE CREDENTIAL: the subject's connector declaration NAMES an environment variable. This file checks that the name is present and
 * passes the value straight into the request at the moment of sending (liveTransport); it is never read into a variable here, printed,
 * echoed, logged, hashed or measured — not its length, not any part. Fixtures never use it.
 * 🔴 TEST SEAMS: ALMIVISIBILITY_TEST_TRANSPORT (a fake transport module under test/) and ALMIVISIBILITY_TEST_GREEN (a test GREEN record and its
 * text) are honoured ONLY inside a verified test run (node --test); anywhere else their presence HALTS the run before anything is read.
 * 🔴 RR-159 · AN AI-LED PLAN (kind AI_LED_COLLECTION_PLAN; F16 Acceptance Amendment 3, C17–C24) runs through this SAME preflight, GREEN and
 * governed writes, with --ai-connection when it reaches the client's own AI connection: the queries its subject's declaration forms, the
 * client's connection CONNECTED, the client's credential by presence, a CURRENT owner provider record for that provider, and an adapter for
 * it (none exists yet: PROVIDER_ADAPTER_ABSENT). Each provider call goes through the paid-provider controls; only addresses survive; the
 * source's own reader reads the posts; a DISCONNECT stops the run where it stands. ALMIVISIBILITY_TEST_PROVIDER (a fake provider module
 * under test/) is a test seam like the two above.
 * Generic: it names no product, tenant, exam, host or source.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, resolve as resolvePath, relative, isAbsolute } from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { inVerifiedTestContext } from "../src/governance/governed-run.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor, createTenantResolver } from "../src/tenancy/resolver.mjs";
import { decideForTenant } from "../src/tenancy/scope.mjs";
import { lookupStore, lookupSubject, lookupConnector } from "../src/tenancy/root-registry.mjs";
import { openConnector, siteOriginsOf } from "../src/tenancy/connectors.mjs";
import { writePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { ADAPTERS } from "../src/research/adapters/index.mjs";
import { BATCH_PURPOSES } from "../src/research/human-observation.mjs";
import { RECORD_TYPE } from "../src/research/public-questions.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { WITHDRAWN_PLANS } from "../config/research/withdrawn-plans.mjs";
import { contentHashOf } from "../src/authority/corpus.mjs";
import { planSha256, fileSha256, planRefusals, greenRefusals, preflight, runCollection, intakeOf, runRecord, spentGreens, reportLines, AI_PLAN_KIND, PROVIDER_CALL_CEILING, OUTCOMES } from "../src/research/collection.mjs";
import { AI_CONNECTOR_KIND, CONNECTION, DISCOVERY, ABSENT_MEANING, connectionNow, discoveryRouteOf, formResearchQueries, queryRefusals, providerRecordRefusals } from "../src/research/ai-connection.mjs";
import { runAiLed } from "../src/research/ai-led-collection.mjs";
import { AI_PROVIDER_ADAPTERS } from "../src/research/ai-providers/index.mjs";
import { BUILT_ADAPTERS } from "../src/research/ai-providers/built.mjs";
import { governedProviderCall } from "../src/governance/governed-provider-call.mjs";
import { researchDerivedStoreRefusals } from "../src/research/research-derived.mjs";
import { namedActor, namedApproval } from "../src/governance/authorisation.mjs";

const REPO = resolvePath(new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const KIND = "QUESTION_SOURCE_API";
const TEST_TRANSPORT = "ALMIVISIBILITY_TEST_TRANSPORT", TEST_GREEN = "ALMIVISIBILITY_TEST_GREEN", TEST_PROVIDER = "ALMIVISIBILITY_TEST_PROVIDER";
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch"), GREEN = arg("green"), GOV = arg("governance-root");
const PLAN_FILE = "collection-plan.json", RELEVANCE_FILE = "relevance-profile.json", CONNECTION_FILE = "ai-connection.jsonl";
/* RR-159 · C17: a run that reaches the client's own AI connection says so at entry, so that connector is decided with everything else */
const AI_RUN = process.argv.includes("--ai-connection");

/* the test seams halt everywhere but inside a verified test run — before anything is read */
const seams = [TEST_TRANSPORT, TEST_GREEN, TEST_PROVIDER].filter((k) => Object.hasOwn(process.env, k) && process.env[k] !== "");
if (seams.length && !inVerifiedTestContext(process.env)) { console.error(`🔴 HALTED — ${seams.join(", ")} set outside a verified test run; nothing read, no request`); process.exit(4); }
if (!SUBJECT || !BATCH) { console.error("usage: node bin/collect-public-questions.mjs --subject=<id> --research-batch=<id> --green=<authority id> --governance-root=<dir> --confirm — nothing read, no request"); process.exit(2); }
const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
if (!permission.mayWrite) { console.error("🔴 REFUSED — COLLECTION_REQUIRES_CONFIRM: there is no dry run; nothing read, no request"); process.exit(2); }

const SCOPE = scopedEntryPoint({ entry: "bin/collect-public-questions.mjs", governed: true, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH), RESOURCES.connector(SUBJECT, KIND), ...(AI_RUN ? [RESOURCES.connector(SUBJECT, AI_CONNECTOR_KIND)] : []), ...(seams.includes(TEST_GREEN) ? [RESOURCES.inputPath(process.env[TEST_GREEN], "--test-green")] : [])] });
const index = rootIndexFor(process.env);
const store = lookupStore(index, "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}; no request`); process.exit(3); }
const subject = lookupSubject(index, SUBJECT);
const members = subject.entry?.members ?? [];
if (!members.some((m) => m.resourceKind === "RESEARCH_BATCH" && m.resourceRef === BATCH)) { console.error("🔴 REFUSED — BATCH_NOT_THIS_SUBJECTS: the subject does not declare this research batch; no request"); process.exit(3); }
const batchDir = join(store.dir, BATCH);
if (!existsSync(batchDir)) { console.error("🔴 REFUSED — RESEARCH_BATCH_ABSENT; no request"); process.exit(3); }
const manifestPath = join(batchDir, "batch.json");
const dataPurpose = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8"))?.purpose ?? null : null;
if (dataPurpose !== null && !BATCH_PURPOSES.includes(dataPurpose)) { console.error("🔴 REFUSED — BATCH_PURPOSE_UNDECLARED; no request"); process.exit(3); }
const origin = members.find((m) => m.resourceKind === "SITE_ORIGIN")?.resourceRef ?? null;

const readIn = (f) => (existsSync(join(batchDir, f)) ? readFileSync(join(batchDir, f), "utf8") : null);
const parse = (s) => { try { return s === null ? null : JSON.parse(s); } catch { return null; } };
const planBytes = readIn(PLAN_FILE), relevanceBytes = readIn(RELEVANCE_FILE);
const plan = parse(planBytes), relevance = parse(relevanceBytes);
const planSha = planBytes === null ? null : planSha256(planBytes);
const adapter = plan && Object.hasOwn(ADAPTERS, plan.adapter) ? ADAPTERS[plan.adapter] : null;
/* the plan's tenant reaches this run only through the one decision: is this batch allowed for the tenant the plan names? */
const tenantDecidedAllowed = typeof plan?.tenantId === "string" && decideForTenant(createTenantResolver(), plan.tenantId, RESOURCES.researchBatch(BATCH)).allowed === true;
const planCheck = [...planRefusals(plan, { subject: SUBJECT, batch: BATCH, tenantDecidedAllowed }), ...(plan && !adapter ? ["PLAN_ADAPTER_UNKNOWN"] : [])];
const connector = lookupConnector(index, SUBJECT, KIND);
const credentialName = connector.state === "DECLARED" ? connector.connector.credential?.name ?? null : null;
const connectorDeclared = connector.state === "DECLARED" && credentialName !== null && adapter !== null && siteOriginsOf(connector.connector).has(adapter.API_ORIGIN);

/* the GREEN: the register's record, its committed text verified against the register's own content hash */
let records = AUTHORITY_CORPUS, testGreen = null;
if (Object.hasOwn(process.env, TEST_GREEN) && process.env[TEST_GREEN] !== "") {
  testGreen = JSON.parse(readFileSync(process.env[TEST_GREEN], "utf8"));
  /* RR-159: the test GREEN file may carry further test records (an owner provider record), each with its text — test runs only */
  records = [...AUTHORITY_CORPUS, testGreen.record, ...(testGreen.also ?? []).map((x) => x.record)];
}
const testTextOf = (rec) => (testGreen ? [testGreen, ...(testGreen.also ?? [])].find((x) => x.record.authorityId === rec.authorityId)?.text ?? null : null);
const textOf = (rec) => {
  let text = null;
  if (testTextOf(rec) !== null) text = testTextOf(rec);
  else if (GOV && rec.sourceRef?.repo === "_handoffs") { try { text = execFileSync("git", ["-C", GOV, "show", `${rec.sourceRef.commit}:${rec.sourceRef.path}`], { encoding: "utf8" }); } catch { text = null; } }
  return text !== null && contentHashOf(text) === rec.contentHash ? text : null;
};
const runsFile = join(batchDir, "collection-runs.jsonl");
const earlierRuns = existsSync(runsFile) ? createJsonlStore(runsFile).readAll() : [];
const now = new Date().toISOString().slice(0, 10);
const green = greenRefusals({ greenId: GREEN, records, textOf, planSha, plan, spent: spentGreens(earlierRuns), now });

/* RR-159 · F16 C17–C23 · an AI-LED plan's own conditions, decided in the SAME preflight before any provider call or source request */
const aiPlan = plan?.kind === AI_PLAN_KIND && planCheck.length === 0;
const connectionRows = () => (existsSync(join(batchDir, CONNECTION_FILE)) ? createJsonlStore(join(batchDir, CONNECTION_FILE)).readAll() : []);
const discoveryChecks = [];
let ai = null, formed = { queries: [], missing: [] }, discoveryRoute = null;
if (aiPlan) {
  ai = plan.discovery.ai;
  discoveryRoute = discoveryRouteOf({ aiConnection: ai !== null, suppliedLinks: plan.discovery.suppliedLinks });
  if (ai) {
    const descriptor = parse(subject.state === "DECLARED" && existsSync(join(subject.dir, "descriptor.json")) ? readFileSync(join(subject.dir, "descriptor.json"), "utf8") : null);
    formed = formResearchQueries(descriptor);
    if (formed.missing.length) discoveryChecks.push("SUBJECT_DECLARATION_FORMS_NO_QUERY");
    else discoveryChecks.push(...queryRefusals(ai.queries, formed.queries));
    if (!AI_RUN) discoveryChecks.push("AI_CONNECTION_NOT_DECIDED_AT_ENTRY");
    const c = lookupConnector(index, SUBJECT, AI_CONNECTOR_KIND);
    const origins = c.state === "DECLARED" ? [...siteOriginsOf(c.connector)] : [];
    const aiCredential = c.state === "DECLARED" ? c.connector.credential?.name ?? null : null;
    if (c.state !== "DECLARED" || c.connector.connectorId !== ai.connectorId || origins.length !== 1) discoveryChecks.push("AI_CONNECTION_UNDECLARED");
    /* the client's own credential: by PRESENCE only — its value is never read here */
    if (aiCredential === null || !Object.hasOwn(process.env, aiCredential)) discoveryChecks.push("AI_CREDENTIAL_ABSENT");
    const state = connectionNow(connectionRows(), { subject: SUBJECT, connectorId: ai.connectorId });
    if (state !== CONNECTION.CONNECTED) discoveryChecks.push(`AI_CONNECTION_${state}`);
    discoveryChecks.push(...providerRecordRefusals({ records, propositionId: ai.providerRecord, textOf, now, providerId: ai.providerId, origin: origins[0] ?? null }));
    /* RR-161 · C25: a provider whose adapter is BUILT but not REGISTERED is refused by that name, its options still checked */
    if (!seams.includes(TEST_PROVIDER) && !Object.hasOwn(AI_PROVIDER_ADAPTERS, ai.providerId)) {
      if (Object.hasOwn(BUILT_ADAPTERS, ai.providerId)) discoveryChecks.push("PROVIDER_ADAPTER_BUILT_NOT_REGISTERED", ...BUILT_ADAPTERS[ai.providerId].optionsRefusals(ai.providerOptions));
      else discoveryChecks.push("PROVIDER_ADAPTER_ABSENT");
    }
    else if (!seams.includes(TEST_PROVIDER)) discoveryChecks.push(...AI_PROVIDER_ADAPTERS[ai.providerId].optionsRefusals(ai.providerOptions));
    /* RR-161 · C25: the plan's authorization for the provider expires on its declared day — after it, nothing is called */
    if (ai.expiresOn < now) discoveryChecks.push("PLAN_AUTHORIZATION_EXPIRED");
  }
}
const pre = preflight({
  subjectDeclared: subject.state === "DECLARED", connectorDeclared, plan, planCheck, planSha, withdrawn: WITHDRAWN_PLANS, records, sourceDecision: adapter?.SOURCE_DECISION ?? null,
  decl: adapter?.DECLARATION ?? null, credentialPresent: credentialName !== null && Object.hasOwn(process.env, credentialName), green, relevanceSha: relevanceBytes === null ? null : fileSha256(relevanceBytes), now,
  discovery: discoveryChecks,
});

const instant = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const append = (recs, file, action) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope,
  repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(join(batchDir, file)), records: recs,
  targetClass: "GENERATED_CONFIG", action, occurredAt: instant(), correlationId: `run:collect-public-questions:${instant()}`, discipline: "APPEND_IF_NEW",
}));
const persisted = (g) => g.outcome === "COMMITTED" || g.outcome === "ALREADY_COMMITTED";
console.log("F16 · PUBLIC-QUESTION COLLECTION — this tenant's subject only, one exact bounded plan, count-only");

if (!pre.ok) {
  const rec = runRecord({ plan, planSha, greenId: GREEN, preflightRefusals: pre.refusals, at: instant() });
  const g = append([rec], "collection-runs.jsonl", "APPEND_COLLECTION_RUN");
  for (const l of reportLines(rec)) console.log(`  ${l}`);
  console.log(`  refusal ${persisted(g) ? "recorded" : `NOT recorded (${g.outcome})`}`);
  process.exit(3);
}

/* only now is a transport constructed: a fake one inside a verified test run, else the subject's own declared connector */
let transport;
if (Object.hasOwn(process.env, TEST_TRANSPORT) && process.env[TEST_TRANSPORT] !== "") {
  const p = resolvePath(process.env[TEST_TRANSPORT]);
  const rel = relative(join(REPO, "test"), p);
  if (rel.startsWith("..") || isAbsolute(rel)) { console.error("🔴 HALTED — the test transport is not under test/; no request"); process.exit(4); }
  transport = (await import(pathToFileURL(p).href)).default;
} else {
  const opened = openConnector({ scope: SCOPE, subjectId: SUBJECT, kind: KIND });
  transport = liveTransport(opened, adapter, credentialName);
}
const clock = () => Math.floor(Date.now() / 1000);
if (aiPlan) await aiLedRunAndExit();
const run = await runCollection({ collect: adapter.collect, transport, clock, plan });
const qFile = join(batchDir, "questions.jsonl");
const existing = existsSync(qFile) ? createJsonlStore(qFile).readAll().filter((x) => x.record_type === RECORD_TYPE).map((x) => x.question_id) : [];
const intake = intakeOf({ run, adapter, plan, subject: SUBJECT, origin, relevance, existingQuestionIds: existing, dataPurpose });
const rec = runRecord({ plan, planSha, greenId: GREEN, run, intake, at: instant() });
/* the run record FIRST: it spends the GREEN even if a later write fails */
const g0 = append([rec], "collection-runs.jsonl", "APPEND_COLLECTION_RUN");
if (!persisted(g0)) { console.error(`  🔴 ${g0.outcome} — the run record did NOT persist; nothing else written`); process.exit(1); }
if (intake.leads.length) {
  const g = append(intake.leads, "leads.jsonl", "APPEND_RESEARCH_LEADS");
  if (!persisted(g)) { console.error(`  🔴 ${g.outcome} — ${intake.leads.length} lead(s) did NOT persist`); process.exit(1); }
}
if ((intake.held ?? []).length) {
  const g = append(intake.held, "held-for-judgement.jsonl", "APPEND_HELD_FOR_JUDGEMENT");
  if (!persisted(g)) { console.error(`  🔴 ${g.outcome} — ${intake.held.length} held item(s) did NOT persist`); process.exit(1); }
}
if (intake.questions.length) {
  const g = append(intake.questions, "questions.jsonl", "APPEND_SOURCE_QUESTIONS");
  if (!persisted(g)) { console.error(`  🔴 ${g.outcome} — ${intake.questions.length} question(s) did NOT persist`); process.exit(1); }
}
for (const l of reportLines(rec)) console.log(`  ${l}`);
process.exit(rec.value.outcome === "COMPLETED" ? 0 : 3);

/**
 * RR-159 · F16 C17–C24 · THE AI-LED RUN, after the one preflight passed: discovery ABSENT is recorded as a state; otherwise each formed query
 * is one provider call through the paid-provider controls (src/cost/paid-provider-gate.mjs — off by default, the authorization this plan's
 * GREEN gives, a kill switch, a ledger entry for every call and every refusal), the connection asked again before every call and every
 * source read; only addresses survive; the source's own reader reads the posts; the EXISTING intake admits, holds or refuses.
 */
async function aiLedRunAndExit() {
  const writeOrExit = (recs, file, action, what) => { if (!recs.length) return; const g = append(recs, file, action); if (!persisted(g)) { console.error(`  🔴 ${g.outcome} — ${recs.length} ${what} did NOT persist`); process.exit(1); } };
  if (discoveryRoute === DISCOVERY.ABSENT) {
    const rec = runRecord({ plan, planSha, greenId: GREEN, at: instant(), discovery: { state: DISCOVERY.ABSENT, meaning: ABSENT_MEANING, asAt: `as at ${instant()}` } });
    writeOrExit([rec], "collection-runs.jsonl", "APPEND_COLLECTION_RUN", "run record");
    for (const l of reportLines(rec)) console.log(`  ${l}`);
    process.exit(0);
  }
  /* every provider call goes through the governed provider call (src/governance/governed-provider-call.mjs): the paid-provider controls
   * over an IN-MEMORY ledger; every entry reaches the batch only through the governed append below */
  let provider = null;
  if (ai) {
    let fakeProvider = null, approvals = null, approvalRef = namedApproval(process.argv), opened = null, credentialName = null;
    if (seams.includes(TEST_PROVIDER)) {
      const p = resolvePath(process.env[TEST_PROVIDER]);
      const rel = relative(join(REPO, "test"), p);
      if (rel.startsWith("..") || isAbsolute(rel)) { console.error("🔴 HALTED — the test provider is not under test/; no provider call"); process.exit(4); }
      const made = (await import(pathToFileURL(p).href)).default({ env: process.env, providerId: ai.providerId, pricePerCall: ai.pricePerCall });
      ({ provider: fakeProvider, approvals = null, approvalRef = approvalRef } = made);
    } else {
      opened = openConnector({ scope: SCOPE, subjectId: SUBJECT, kind: AI_CONNECTOR_KIND });
      credentialName = lookupConnector(index, SUBJECT, AI_CONNECTOR_KIND).connector.credential.name;
    }
    const greenRecord = records.find((r) => r.authorityId === GREEN);
    const authorization = { provider: ai.providerId, tenantId: plan.tenantId, expiresOn: ai.expiresOn, authorizedBy: GREEN, date: greenRecord.issuedAt,
      reason: `the owner's GREEN ${GREEN} names this exact plan (${planSha})`, budget: ai.budget, cap: { maxCalls: Math.min(ai.providerCalls, PROVIDER_CALL_CEILING) } };
    provider = governedProviderCall({ providerId: ai.providerId, fakeProvider, opened, credentialName, pricePerCall: ai.pricePerCall, providerOptions: ai.providerOptions, authorization, now: instant,
      spendAuthority: { actorRef: namedActor(process.argv), scope: { scopeType: "TENANT", tenantId: plan.tenantId }, approvalRef, ...(approvals ? { approvals } : {}) } });
  }
  const callProvider = provider ? provider.call : null;
  const connected = () => ai === null || connectionNow(connectionRows(), { subject: SUBJECT, connectorId: ai.connectorId }) === CONNECTION.CONNECTED;
  const queries = ai ? ai.queries.map((t) => formed.queries.find((q) => q.text === t)) : [];
  const r = await runAiLed({ plan, queries, callProvider, connected, adapter, transport, clock, at: instant });
  const runLike = { ...r.source, stoppedBy: r.stoppedBy };
  const qFile = join(batchDir, "questions.jsonl");
  const existing = existsSync(qFile) ? createJsonlStore(qFile).readAll().filter((x) => x.record_type === RECORD_TYPE).map((x) => x.question_id) : [];
  /* the EXISTING intake decides admission; its own per-item leads are replaced by the discovery leads, which already stand for them */
  const intake = { ...intakeOf({ run: runLike, adapter, plan, subject: SUBJECT, origin, relevance, existingQuestionIds: existing, dataPurpose }), leads: r.leads };
  const rec = runRecord({ plan, planSha, greenId: GREEN, run: runLike, intake, at: instant(), discovery: { state: discoveryRoute, ...r.discovery } });
  /* the run record FIRST: it spends the GREEN even if a later write fails */
  writeOrExit([rec], "collection-runs.jsonl", "APPEND_COLLECTION_RUN", "run record");
  writeOrExit(intake.leads, "leads.jsonl", "APPEND_DISCOVERY_LEADS", "lead(s)");
  /* RR-170 · F16 C27/C29/C31: the route-1 RESEARCH-DERIVED questions, in their own store — nothing but a research-derived question enters it */
  const kindRefusals = researchDerivedStoreRefusals(r.researchDerived);
  if (kindRefusals.length) { console.error(`  🔴 REFUSED — ${kindRefusals[0]}: a record of another kind was offered to the research-derived store; nothing of it written`); process.exit(1); }
  writeOrExit(r.researchDerived, "research-derived-questions.jsonl", "APPEND_RESEARCH_DERIVED_QUESTIONS", "research-derived question(s)");
  writeOrExit(intake.held ?? [], "held-for-judgement.jsonl", "APPEND_HELD_FOR_JUDGEMENT", "held item(s)");
  writeOrExit(intake.questions, "questions.jsonl", "APPEND_SOURCE_QUESTIONS", "question(s)");
  /* every call AND every refusal the paid-provider controls made, each once by its entry id */
  const entries = provider ? provider.entries() : [];
  writeOrExit(entries.map((e) => ({ ...e, measurement_key: `cost_entry:${e.entry_id}` })), "provider-ledger.jsonl", "APPEND_PROVIDER_CALL_LEDGER", "ledger entr(ies)");
  for (const l of reportLines(rec)) console.log(`  ${l}`);
  console.log(`  provider ledger ${entries.length} entr(ies): calls ${entries.filter((e) => e.outcome === "CALLED").length} · refusals ${entries.filter((e) => e.outcome === "REFUSED").length}`);
  console.log(`  research-derived questions (route 1, wording marked GENERATED; never OBSERVED, never demand): ${r.researchDerived.length}`);
  process.exit([OUTCOMES.COMPLETED, OUTCOMES.DISCONNECTED].includes(rec.value.outcome) ? 0 : 3);
}

/**
 * The live transport over the subject's OWN opened connector (it reaches only the origins it declares). The key is set on the request at
 * the moment of sending, straight from the named variable; any failure becomes a code — never a message that could carry the URL.
 */
function liveTransport(opened, src, name) {
  return async (method, params) => {
    const url = new URL(src.requestUrl(method, params));
    url.searchParams.set("key", process.env[name]);
    let res;
    try { res = await opened.fetch(url, { headers: { accept: "application/json" } }); } catch { return { error_name: "TRANSPORT_REFUSED" }; }
    let body;
    try { body = await res.json(); } catch { return { error_name: "NOT_JSON_BOT_CHALLENGE_OR_PAGE" }; }
    if (!res.ok) return { error_id: Number.isInteger(body?.error_id) ? body.error_id : res.status, error_name: typeof body?.error_name === "string" ? body.error_name : `HTTP_${res.status}` };
    return body;
  };
}
