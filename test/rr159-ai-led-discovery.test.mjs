/**
 * 🔴 RR-159 · F16 C17–C24 · ONE WORKING RESEARCH PATH — the client's own AI connection says WHERE, the source's own reader reads the
 * original post, a NAMED judge rules on the post's own quoted words, F16 admits it, F91 connects it (Acceptance Amendment 3, _handoffs 1e48cb8).
 *
 * Driven through the PRODUCTION entry points (bin/ai-connection.mjs, bin/collect-public-questions.mjs, bin/judge-public-questions.mjs,
 * bin/public-questions.mjs) and F91's production connection code, in a CONFINED copy of the data root, under the declared test subject's
 * REAL tenant, descriptor, batch and meaning profile (copied, never written back). A FAKE provider and a FAKE source transport only — zero
 * real requests of either. 🔴 Every question here is a FIXTURE: it proves the mechanism and is never reported as a real public question.
 *
 *   P1  the whole path, end to end — and NO provider text anywhere (C19, C21, C22)
 *   P2  C17 · no provider is reached without a CURRENT owner provider record, its citation and its date, the client's credential, a GREEN,
 *       a connection, an adapter — each refused BY NAME before any provider call or source request
 *   P3  C18 · a disconnect: refused before a run; a run in flight STOPS, records it, as at, with what it left unread; records SURVIVE
 *   P4  C20 · the product asks: a hand-written query is refused; origin country never splits a need
 *   P5  C21 · five kinds, five record types, never one
 *   P6  C23 · supplied links are a lead route of their own; with neither route discovery is ABSENT — a state, never zero
 *   P7  C24 · the provider-call cap, the ledger, the F04 spend approval, the ceiling
 *   P8  C17/C14 · the credential's value is never touched; the reusable model names no provider and no plan tier
 *   P9  F77 · the paid-provider census sees the registry-fed gate as REAL exactly when the registry holds an adapter
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { declaredWorld, inputPathRef, DATA_ROOT } from "./helpers/declared-world.mjs";
import { contentHashOf } from "../src/authority/corpus.mjs";
import { planSha256, AI_PLAN_KIND, PROVIDER_CALL_CEILING } from "../src/research/collection.mjs";
import { formResearchQueries, addressesIn, leadRecord, LEAD_KINDS, RESOLUTION, discoveryRouteOf, DISCOVERY, PROVIDER_CAPABILITY, connectionEvent, connectionNow } from "../src/research/ai-connection.mjs";
import { ROUTE_RECORD, RESEARCH_KINDS } from "../src/research/research-routes.mjs";
import { connectQuestions, readConnections, refusalOf, REFUSAL } from "../src/page/demand-connection.mjs";
import { API_ORIGIN, idsFromAddresses } from "../src/research/adapters/stack-exchange.mjs";
import { censusOf, productionFiles } from "../tools/paid-metered-call-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const TMP = join(tmpdir(), `almi-rr159-${process.pid}`);
const SUBJECT = "lamzish";
const TODAY = new Date().toISOString().slice(0, 10);
const E = (iso) => Date.parse(iso) / 1000;

const ROOTS = JSON.parse(readFileSync(join(DATA_ROOT, "roots.json"), "utf8"));
const ENTRY = ROOTS.subjects.find((s) => s.subjectId === SUBJECT);
const ATT = JSON.parse(readFileSync(join(DATA_ROOT, "tenancy", "attachments.json"), "utf8")).attachments;
const ORIGIN = ENTRY.members.find((m) => m.resourceKind === "SITE_ORIGIN").resourceRef;
const TENANT = ATT.find((a) => a.resourceKind === "SITE_ORIGIN" && a.resourceRef === ORIGIN).tenantId;
const KEY_NAME = ENTRY.connectors.find((c) => c.kind === "QUESTION_SOURCE_API").credential.name;
const DESCRIPTOR = JSON.parse(readFileSync(join(DATA_ROOT, ENTRY.path, "descriptor.json"), "utf8"));
const BATCH = ENTRY.members.filter((m) => m.resourceKind === "RESEARCH_BATCH").map((m) => m.resourceRef)
  .find((b) => existsSync(join(DATA_ROOT, "research", b, "relevance-profile.json")) && JSON.parse(readFileSync(join(DATA_ROOT, "research", b, "relevance-profile.json"), "utf8")).mode === "MEANING_JUDGEMENT");
const PROFILE_SHA = BATCH ? planSha256(readFileSync(join(DATA_ROOT, "research", BATCH, "relevance-profile.json"), "utf8")) : null;
const SITE = BATCH ? JSON.parse(readFileSync(join(DATA_ROOT, "research", BATCH, "collection-plan.json"), "utf8")).site : null;
const FORMED = formResearchQueries(DESCRIPTOR).queries;

/* the client's own AI connection, declared in the CONFINED copy only — a fixture provider at a reserved, non-existent origin */
const AI_ORIGIN = "https://fixture-ai-provider.invalid", AI_KEY = "FIXTURE_CLIENT_AI_KEY", AI_CONNECTOR = "client-ai", PROVIDER = "fixture-ai";
const AI_SECRET = "sentinel-ai-credential-value-7f3c", QS_SECRET = "sentinel-credential-value-0b12";
const SENTINEL = "SENTINEL-PROVIDER-PROSE-91c4";
const postUrl = (id) => `https://${SITE}.stackexchange.com/questions/${id}/fixture-slug`;

let n = 0;
const file = (name, content) => { mkdirSync(TMP, { recursive: true }); const p = join(TMP, `${++n}-${name}`); writeFileSync(p, typeof content === "string" ? content : JSON.stringify(content)); return p; };
function attach(W, kind, ref, tenant) {
  const af = join(W.root, "tenancy", "attachments.json");
  const a = JSON.parse(readFileSync(af, "utf8"));
  const hit = a.attachments.find((x) => x.resourceKind === kind && x.resourceRef === ref);
  if (hit) hit.tenantId = tenant; else a.attachments.push({ ...a.attachments[0], resourceKind: kind, resourceRef: ref, tenantId: tenant });
  writeFileSync(af, JSON.stringify(a, null, 2));
}
function world({ aiConnector = true } = {}) {
  const W = declaredWorld();
  const tf = join(W.root, "tenancy", "tenants.json");
  const t = JSON.parse(readFileSync(tf, "utf8"));
  t.tenants.push({ schemaVersion: 1, tenantId: TENANT, status: "ACTIVE", declaredOn: TODAY, declarationBasis: "F02_DECLARED_FIXTURE_WORLD_NOT_THE_REAL_POPULATION", label: "the subject's real tenant, in a confined copy" });
  writeFileSync(tf, JSON.stringify(t, null, 2));
  for (const [k, r] of [...ENTRY.members.map((m) => [m.resourceKind, m.resourceRef]), ["SITE_ORIGIN", API_ORIGIN], ["SITE_ORIGIN", AI_ORIGIN]]) attach(W, k, r, TENANT);
  if (aiConnector) {
    const rf = join(W.root, "roots.json");
    const roots = JSON.parse(readFileSync(rf, "utf8"));
    roots.subjects.find((s) => s.subjectId === SUBJECT).connectors.push({ connectorId: AI_CONNECTOR, kind: "AI_PROVIDER", credential: { mechanism: "ENV_REFERENCE", name: AI_KEY }, reaches: [{ resourceKind: "SITE_ORIGIN", resourceRef: AI_ORIGIN }] });
    writeFileSync(rf, JSON.stringify(roots, null, 2));
  }
  return W;
}
const authorityRecord = (path, propositionId, text) => ({ authorityId: `_handoffs:${path}`, propositionId, scope: ["ALMIVISIBILITY"], issuer: { class: "OWNER", declaredBy: "fixture" },
  issuedAt: TODAY, issuedAtSource: "FILE_NAME", effectiveFrom: TODAY, sourceRef: { kind: "GOVERNANCE_RECORD", repo: "_handoffs", path, commit: "0".repeat(40), blob: "0".repeat(40) },
  status: "CURRENT", supersedes: [], supersededBy: [], contentHash: contentHashOf(text), recordedAt: `${TODAY}T00:00:00Z`, inclusionRule: "fixture" });
const providerText = ({ provider = PROVIDER, origin = AI_ORIGIN, capability = PROVIDER_CAPABILITY, cites = "fixture: the provider's own terms, quoted", readOn = TODAY } = {}) =>
  `fixture OWNER PROVIDER RECORD — test data only\n\nOWNER PROVIDER RECORD v1\nprovider: ${provider}\norigin: ${origin}\ncapability: ${capability}\ncites: ${cites}\nread on: ${readOn}\nEND OWNER PROVIDER RECORD\n`;
/** A test GREEN for the plan, carrying (as `also`) the owner provider record the plan names — or none. */
function green(planSha, { provider = providerText(), propositionId, requests = 2 } = {}) {
  const k = ++n;
  const text = `fixture GREEN record\n\nOWNER GREEN v1\nplan: ${planSha}\nrequests: ${requests}\nEND OWNER GREEN\n`;
  const g = authorityRecord(`AlmiVisibility_OWNER_DECISION_${TODAY}_FIXTURE_GREEN_r${k}.md`, `OWNER_DECISION_FIXTURE_GREEN_r${k}`, text);
  const also = provider === null ? [] : [{ record: authorityRecord(`AlmiVisibility_OWNER_DECISION_${TODAY}_FIXTURE_PROVIDER_r${k}.md`, propositionId, provider), text: provider }];
  return { id: g.authorityId, path: file("green.json", { record: g, text, also }) };
}
const aiBlock = (over = {}) => ({ connectorId: AI_CONNECTOR, providerId: PROVIDER, providerRecord: null, queries: [FORMED[0].text], providerCalls: 1,
  budget: { amount: 1, currency: "USD" }, pricePerCall: { amount: 0.01, currency: "USD" }, expiresOn: "2099-12-31", providerOptions: null, ...over });
const planOf = ({ ai = aiBlock(), suppliedLinks = [], maxLeads = 10, planId = `lamzish-ai-led-fixture-${++n}` } = {}) => ({
  schemaVersion: 1, kind: AI_PLAN_KIND, planId, subject: SUBJECT, tenantId: TENANT, researchBatch: BATCH, adapter: "stack-exchange", site: SITE, language: "en", requests: 2,
  relevanceProfileSha256: PROFILE_SHA, keeps: ["each lead as an ADDRESS only, with how it was found and what reading it showed", "for each post the boundary holds: its title, its original post's own text (never a reply), link, dates, author display name, licence and attribution"],
  retention: "kept in this confined fixture copy only; removed with it", declaredOn: TODAY, discovery: { ai, suppliedLinks, maxLeads } });
const post = (id, title, body) => ({ question_id: id, title, link: postUrl(id), creation_date: E("2022-03-01T10:00:00Z"), owner: { display_name: `fixture-user-${id}` }, content_license: "CC BY-SA 4.0", body });
const ONE = post(11, "Building back home from abroad", "<p>I live abroad and want to hire an architect to build our family home in Pakistan.</p>");
const spawn = (W, args, env = {}) => { const r = spawnSync(process.execPath, args, { cwd: REPO, encoding: "utf8", env: { ...W.envWith(), ...env } }); return { r, out: r.stdout + r.stderr }; };
const batchFile = (W, f) => join(W.root, "research", BATCH, f);
const stored = (W, f) => (existsSync(batchFile(W, f)) ? readFileSync(batchFile(W, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const lines = (p) => (existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean) : []);
const connection = (W, how) => spawn(W, ["bin/ai-connection.mjs", `--subject=${SUBJECT}`, `--research-batch=${BATCH}`, `--tenant=${TENANT}`, "--actor=actor:cc", how, "--confirm"]);

/**
 * One AI-led collection run in the confined world: writes the plan, a GREEN naming it (with its provider record unless told otherwise),
 * a provider scenario and a source scenario, and spawns the production entry point. Returns the run's output and both fakes' call counts.
 */
function collect(W, { plan, provider = providerText(), outputs = [{ text: "" }], responses = [], disconnect = null, withholdApproval = false, aiFlag = true, env = {}, omitAiKey = false, greenId = undefined } = {}) {
  const p = plan ?? planOf();
  /* the plan names its owner provider record by proposition; the GREEN that names the plan's hash carries that record (test runs only) */
  const propositionId = `OWNER_PROVIDER_RECORD_FIXTURE_r${++n}`;
  if (p.discovery.ai) p.discovery.ai.providerRecord ??= propositionId;
  const bytes = JSON.stringify(p, null, 2);
  writeFileSync(batchFile(W, "collection-plan.json"), bytes);
  const g = green(planSha256(bytes), { provider, propositionId: p.discovery.ai?.providerRecord ?? propositionId });
  attach(W, "INPUT_PATH", inputPathRef(g.path), TENANT);
  const aiCalls = file("ai-calls.jsonl", ""), qsCalls = file("qs-calls.jsonl", "");
  const scenario = file("ai-scenario.json", { outputs, tenantId: TENANT, withholdApproval, disconnect: disconnect ? { ...disconnect, file: batchFile(W, "ai-connection.jsonl"), subject: SUBJECT, connectorId: AI_CONNECTOR } : null });
  const c = spawn(W, ["bin/collect-public-questions.mjs", `--subject=${SUBJECT}`, `--research-batch=${BATCH}`, `--green=${greenId === undefined ? g.id : greenId}`, `--tenant=${TENANT}`, "--actor=actor:cc", ...(aiFlag ? ["--ai-connection"] : []), "--confirm"], {
    [KEY_NAME]: QS_SECRET, ...(omitAiKey ? {} : { [AI_KEY]: AI_SECRET }),
    ALMIVISIBILITY_TEST_TRANSPORT: join(REPO, "test", "fixtures", "fake-question-source-transport.mjs"), ALMIVISIBILITY_TEST_GREEN: g.path,
    ALMIVISIBILITY_TEST_PROVIDER: join(REPO, "test", "fixtures", "fake-ai-provider.mjs"),
    FAKE_QS_SCENARIO: file("qs-scenario.json", { responses }), FAKE_QS_CALLS: qsCalls, FAKE_AI_SCENARIO: scenario, FAKE_AI_CALLS: aiCalls, ...env });
  return { ...c, aiCalls: lines(aiCalls).length, qsCalls: lines(qsCalls).map((l) => JSON.parse(l)), plan: p };
}
const judge = (W, drafts) => { writeFileSync(batchFile(W, "judgement-drafts.json"), JSON.stringify(drafts)); return spawn(W, ["bin/judge-public-questions.mjs", `--subject=${SUBJECT}`, `--research-batch=${BATCH}`, `--tenant=${TENANT}`, "--actor=actor:cc", "--confirm"]); };
const readBack = (W) => spawn(W, ["bin/public-questions.mjs", `--research-batch=${BATCH}`, `--tenant=${TENANT}`, "--actor=actor:cc"]);
const providerSays = (...ids) => ({ text: `${SENTINEL} — an AI answer that must never be kept. The questions live at ${ids.map(postUrl).join(" and ")}; also see https://elsewhere-forum.invalid/thread/5.` });
const everyBatchByte = (W) => readdirSync(join(W.root, "research", BATCH)).map((f) => readFileSync(join(W.root, "research", BATCH, f), "utf8")).join("\n");

test("P0 · the proof is not vacuous: the subject's real meaning batch, its declaration's formed queries, and its source site all exist", () => {
  assert.ok(BATCH && PROFILE_SHA && SITE, "no batch of the subject carries the owner's meaning test");
  assert.equal(FORMED.length, 1 + DESCRIPTOR.productDimensions.services.length, "the declaration did not form one query per declared field and service");
});

test("P1 · THE WHOLE PATH — an AI lead → the original post read through the source's own reader → a NAMED judge on the post's own quoted words → F16 admits it → F91 connects it; no provider text anywhere", () => {
  const W = world();
  try {
    { const k = connection(W, "--connect"); assert.equal(k.r.status, 0, `the client could not connect
${k.out}`); }
    /* RR-170 · C29: the provider also gives question WORDING, as a structured GENERATED list beside its answer prose */
    const WORDING = "FIXTURE-GENERATED-WORDING: how do I build a family home from abroad?";
    const c = collect(W, { outputs: [{ ...providerSays(11, 999), questions: [{ wording: WORDING, generated: true }] }], responses: [{ items: [ONE] }, { items: [ONE] }] });
    assert.equal(c.r.status, 0, c.out);
    assert.equal(c.aiCalls, 1, "the provider was not asked exactly once");
    assert.deepEqual(c.qsCalls.map((x) => x.params.ids), ["11;999", "11"], "the source did not read exactly the on-source lead posts, then recheck the one it returned");
    const leads = stored(W, "leads.jsonl");
    assert.deepEqual(leads.map((l) => [l.kind, l.resolution]).sort(), [["AI_LEAD", RESOLUTION.DEAD], ["AI_LEAD", RESOLUTION.NOT_READ], ["AI_LEAD", RESOLUTION.READ]].sort(), "leads were not resolved READ / DEAD / NOT READ");
    assert.match(c.out, /read 1 · DEAD 1 · NOT READ \(outside every approved source\) 1/);
    assert.equal(stored(W, "questions.jsonl").length, 0, "a lead was admitted as a question before any judgement");
    const held = stored(W, "held-for-judgement.jsonl");
    assert.equal(held.length, 1, "the read post was not held for the meaning judgement");
    const j = judge(W, [{ heldId: held[0].held_id, subject: SUBJECT, basis: "ORIGINAL_POST", verdict: "CANDIDATE", quote: "hire an architect to build our family home in Pakistan", judge: { observerType: "AGENT_OBSERVED", actorRef: "actor:cc" }, judgedAt: `${TODAY}T01:00:00Z` }]);
    assert.match(j.out, /admitted 1/, j.out);
    const q = stored(W, "questions.jsonl");
    assert.equal(q.length, 1);
    assert.equal(q[0].value.meaning.judge.observerType, "AGENT_OBSERVED", "the judge is not named, or an agent reads as a person");
    assert.equal(q[0].value.author.authorResidence, "NOT MEASURED", "a residence was recorded without the post's own words");
    const rb = readBack(W);
    assert.equal(rb.r.status, 0, rb.out);
    assert.match(rb.out, /OBSERVED: 1 of 1 recorded question/, "F16's read-back does not count the admitted question");
    /* F91 — its production connection code, on the admitted record; the subject has no product module, so number 1 is a FIXTURE here */
    const possible = { value: DESCRIPTOR.productDimensions.services.length, candidates: DESCRIPTOR.productDimensions.services.map((s) => ({ service: s })) };
    const conn = connectQuestions({ subject: SUBJECT, possible, records: [...q, ...leads], drafts: [{ questionId: q[0].question_id, combination: { service: "house" } }, ...leads.map((l) => ({ questionId: l.lead_id, combination: { service: "house" } }))], on: TODAY });
    assert.deepEqual(conn.refused.map((x) => x.code), leads.map(() => REFUSAL.LEAD), "a lead reached F91 as demand");
    const rbc = readConnections(conn.records);
    assert.deepEqual([rbc.counts.questions, rbc.counts.needs, rbc.counts.pageCandidates, rbc.counts.heldCoverage], [1, 1, 1, 1], "F91 did not show one question, one need, one page candidate, coverage HELD");
    assert.equal(rbc.needs[0].answer.state, "UNKNOWN", "an answer was invented with no official source read");
    /* C19 as narrowed by C29 (RR-170) — no provider ANSWER prose in ANY record of the batch, nor in what F91 wrote; the provider's question
     * WORDING is kept only as a research-derived question, marked GENERATED, in its own store — never on a lead, never as a question */
    assert.ok(!everyBatchByte(W).includes(SENTINEL), "provider answer prose was kept in a record");
    const rd = stored(W, "research-derived-questions.jsonl");
    assert.deepEqual(rd.map((x) => [x.wording.text, x.wording.generated, x.tier]), [[WORDING, true, "RESEARCH-DERIVED"]], "the GENERATED wording was not kept as one research-derived question");
    assert.ok(!["leads.jsonl", "questions.jsonl", "held-for-judgement.jsonl"].some((x) => readFileSync(batchFile(W, x), "utf8").includes("FIXTURE-GENERATED-WORDING")), "the GENERATED wording reached a lead, a question or a held item");
    assert.ok(!JSON.stringify(conn.records).includes(SENTINEL), "provider-produced text reached F91's connection or need");
    assert.equal(stored(W, "provider-ledger.jsonl").filter((e) => e.outcome === "CALLED").length, 1, "the provider call left no ledger entry");
  } finally { W.cleanup(); }
});

test("P2 · C17 — no provider is reached without each condition; every failure is refused BY NAME before ANY provider call or source request", () => {
  const W = world();
  try {
    { const k = connection(W, "--connect"); assert.equal(k.r.status, 0, k.out); }
    const cases = [
      ["no owner provider record", { provider: null }, /PROVIDER_RECORD_ABSENT/],
      ["a record that cites no terms", { provider: providerText({ cites: "" }) }, /PROVIDER_RECORD_DECLARES_NO_PROVIDER|PROVIDER_RECORD_CITES_NO_TERMS/],
      ["a record that states no read date", { provider: providerText({ readOn: "not read" }) }, /PROVIDER_RECORD_STATES_NO_READ_DATE/],
      ["a record for another provider", { provider: providerText({ provider: "another-provider" }) }, /PROVIDER_RECORD_NAMES_ANOTHER_PROVIDER/],
      ["a capability the record does not permit", { provider: providerText({ capability: "UNKNOWN" }) }, /PROVIDER_CAPABILITY_NOT_PERMITTED/],
      ["a record for another origin", { provider: providerText({ origin: "https://elsewhere.invalid" }) }, /PROVIDER_ORIGIN_IS_NOT_THE_RECORDS/],
      ["the client's credential absent", { omitAiKey: true }, /AI_CREDENTIAL_ABSENT/],
      ["no GREEN", { greenId: "" }, /GREEN_ABSENT/],
      ["the connection not decided at entry", { aiFlag: false }, /AI_CONNECTION_NOT_DECIDED_AT_ENTRY/],
      ["no adapter for the provider (a live run)", { env: { ALMIVISIBILITY_TEST_PROVIDER: "" } }, /PROVIDER_ADAPTER_ABSENT/],
    ];
    for (const [why, o, code] of cases) {
      const c = collect(W, { ...o, outputs: [providerSays(11)], responses: [{ items: [ONE] }, { items: [ONE] }] });
      assert.notEqual(c.r.status, 0, `${why}: the run was not refused\n${c.out}`);
      /* the refusal must be the PREFLIGHT's, by name, and RECORDED — a crash that happens to print the same word is not a refusal */
      const refusedLine = c.out.split(/\r?\n/).find((l) => /REFUSED before any request: /.test(l)) ?? "";
      assert.match(refusedLine, code, `${why}: not refused by name in the preflight\n${c.out}`);
      assert.match(c.out, /refusal recorded/, `${why}: the refusal was not recorded`);
      assert.equal(c.aiCalls, 0, `${why}: the provider was called`);
      assert.equal(c.qsCalls.length, 0, `${why}: the source was called`);
    }
  } finally { W.cleanup(); }
});

test("P3 · C18 — DISCONNECT: refused before a run; a run in flight STOPS, records that it stopped, AS AT, with what it left unread; records written before it SURVIVE unchanged", () => {
  const W = world();
  try {
    { const k = connection(W, "--connect"); assert.equal(k.r.status, 0, k.out); }
    /* (a) a run that meets an earlier disconnect never calls the provider */
    { const k = connection(W, "--disconnect"); assert.equal(k.r.status, 0, k.out); assert.match(k.out, /CONNECTED → DISCONNECTED/); }
    const a = collect(W, { outputs: [providerSays(11)], responses: [{ items: [ONE] }, { items: [ONE] }] });
    assert.notEqual(a.r.status, 0, a.out);
    assert.match(a.out, /AI_CONNECTION_DISCONNECTED/);
    assert.deepEqual([a.aiCalls, a.qsCalls.length], [0, 0], "a disconnected client's provider or source was reached");
    /* (b) reconnect; a full run admits a question; then the client disconnects IN FLIGHT during a second run */
    { const k = connection(W, "--connect"); assert.equal(k.r.status, 0, k.out); }
    const ok = collect(W, { outputs: [providerSays(11)], responses: [{ items: [ONE] }, { items: [ONE] }] });
    assert.equal(ok.r.status, 0, ok.out);
    const held = stored(W, "held-for-judgement.jsonl")[0];
    const j = judge(W, [{ heldId: held.held_id, subject: SUBJECT, basis: "ORIGINAL_POST", verdict: "CANDIDATE", quote: "build our family home in Pakistan", judge: { observerType: "AGENT_OBSERVED", actorRef: "actor:cc" }, judgedAt: `${TODAY}T01:00:00Z` }]);
    assert.match(j.out, /admitted 1/, j.out);
    const before = { q: readFileSync(batchFile(W, "questions.jsonl"), "utf8"), j: readFileSync(batchFile(W, "meaning-judgements.jsonl"), "utf8"), l: readFileSync(batchFile(W, "leads.jsonl"), "utf8") };
    const TWO = post(12, "Designing a house in Lahore while abroad", "<p>We want an architect to design our house.</p>");
    const plan = planOf({ ai: aiBlock({ queries: [FORMED[1].text, FORMED[2].text], providerCalls: 2 }) });
    const b = collect(W, { plan, outputs: [providerSays(12), providerSays(13)], responses: [{ items: [TWO] }, { items: [TWO] }], disconnect: { afterCall: 1 } });
    assert.equal(b.r.status, 0, `a disconnect is a clean stop, not a failure\n${b.out}`);
    assert.equal(b.aiCalls, 1, "the run made a provider call after the client disconnected");
    assert.equal(b.qsCalls.length, 0, "the run read the source after the client disconnected");
    assert.match(b.out, /STOPPED BY DISCONNECT as at \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z: 1 lead\(s\) left unread/, "the stop was not recorded with its as-at moment and what it left unread");
    const runs = stored(W, "collection-runs.jsonl");
    const last = runs.at(-1).value;
    assert.equal(last.outcome, "STOPPED_BY_DISCONNECT");
    assert.deepEqual([last.discovery.providerCalls.made, last.discovery.leads.leftUnread], [1, 1]);
    /* the records written before the disconnect survive byte for byte, and still count */
    assert.equal(readFileSync(batchFile(W, "questions.jsonl"), "utf8"), before.q, "an admitted question was lost or altered by a disconnect");
    assert.equal(readFileSync(batchFile(W, "meaning-judgements.jsonl"), "utf8"), before.j, "a judgement was lost or altered by a disconnect");
    assert.ok(readFileSync(batchFile(W, "leads.jsonl"), "utf8").startsWith(before.l), "an earlier lead was lost or altered by a disconnect");
    const rb = readBack(W);
    assert.match(rb.out, /OBSERVED: 1 of 1 recorded question/, "the admitted question stopped counting after a disconnect");
    assert.doesNotMatch(rb.out + b.out, /re-verif(y|ication) (required|needed)/i, "a disconnect marked records for re-verification");
  } finally { W.cleanup(); }
});

test("P3b · C18 — a reconnect in the SAME SECOND as a disconnect is a new event, never deduplicated away (found by CI, where runs are fast)", () => {
  const at = `${TODAY}T03:00:00Z`;
  const ev = (event, seq) => connectionEvent({ subject: SUBJECT, connectorId: AI_CONNECTOR, event, at, by: "actor:cc", seq });
  /* a store that keeps a record only when its measurement_key is new — as the governed append does */
  const kept = [];
  for (const e of [ev("CONNECTED", 0), ev("DISCONNECTED", 1), ev("CONNECTED", 2)]) if (!kept.some((k) => k.measurement_key === e.measurement_key)) kept.push(e);
  assert.equal(kept.length, 3, "a same-second event was deduplicated into an earlier one");
  assert.equal(connectionNow(kept, { subject: SUBJECT, connectorId: AI_CONNECTOR }), "CONNECTED", "a reconnect in the same second left the client DISCONNECTED");
  assert.throws(() => connectionEvent({ subject: SUBJECT, connectorId: AI_CONNECTOR, event: "CONNECTED", at, by: "actor:cc" }), /sequence number/, "an event with no sequence was accepted");
});

test("P4 · C20 — the PRODUCT asks: a hand-written query is refused; the formed queries carry origin country only in the declared words; one need across countries", () => {
  const W = world();
  try {
    { const k = connection(W, "--connect"); assert.equal(k.r.status, 0, k.out); }
    const c = collect(W, { plan: planOf({ ai: aiBlock({ queries: ["best architects near me — hand written"] }) }), outputs: [providerSays(11)] });
    assert.notEqual(c.r.status, 0, c.out);
    assert.match(c.out, /QUERY_NOT_FORMED_BY_THE_SUBJECTS_DECLARATION/);
    assert.deepEqual([c.aiCalls, c.qsCalls.length], [0, 0]);
  } finally { W.cleanup(); }
  /* the queries are the declaration's own words: the field, each declared service, the declared audience — nothing else */
  for (const q of FORMED) assert.ok(q.text.includes(DESCRIPTOR.ownerValues.audience), "a query left out the declared audience context");
  assert.ok(DESCRIPTOR.productDimensions.services.every((s) => FORMED.some((q) => q.text.includes(`Service: ${s}.`))), "a declared service formed no query");
  /* a declared value's provenance note never reaches a provider */
  assert.ok(FORMED.every((q) => !/_handoffs|RR-\d+|owner's declaration/.test(q.text)), "a provenance note (a record reference) would be sent to the provider");
  assert.equal(new Set(FORMED.map((q) => q.queryId)).size, FORMED.length, "two queries share an id");
  assert.deepEqual(formResearchQueries({ ...DESCRIPTOR, productDimensions: { ...DESCRIPTOR.productDimensions, services: [] } }).queries, [], "CONTROL: with no declared service no query was refused");
  /* origin country never splits a need: the same question asked from two countries is ONE need with ONE page candidate (F91 C10) */
  const Q = (id, country) => ({ record_type: "public_question", question_id: id, recorded_at: `${TODAY}T00:00:00Z`, value: { kind: "OBSERVED", subject: SUBJECT, original: "How do I hire an architect to build a house back home?", country, language: "en", provenance: { observerType: "SOURCE_ADAPTER_OBSERVED", seenBy: "A SOURCE ADAPTER — the text as the source holds it" } } });
  const possible = { value: 1, candidates: [{ service: "house" }] };
  const r = connectQuestions({ subject: SUBJECT, possible, records: [Q("a", "PK"), Q("b", "GB")], drafts: [{ questionId: "a", combination: { service: "house" } }, { questionId: "b", combination: { service: "house" } }], on: TODAY });
  const rb = readConnections(r.records);
  assert.deepEqual([rb.counts.questions, rb.counts.needs, rb.counts.pageCandidates], [2, 1, 1], "origin country split one need into two");
});

test("P5 · C21 — FIVE KINDS, five record types, never one: a route, a lead, a source-verified question, a keyword idea and a client claim", () => {
  assert.deepEqual(Object.keys(RESEARCH_KINDS), ["PROPOSED_ROUTE", "SEARCH_LEAD", "VERIFIED_PUBLIC_QUESTION", "KEYWORD_IDEA", "CLIENT_CLAIM"]);
  const route = { record_type: ROUTE_RECORD, route_id: "r1" };
  const lead = leadRecord({ subject: SUBJECT, planId: "p", kind: LEAD_KINDS.AI, address: postUrl(11), providerId: PROVIDER, resolution: RESOLUTION.READ, at: `${TODAY}T00:00:00Z` });
  const supplied = leadRecord({ subject: SUBJECT, planId: "p", kind: LEAD_KINDS.SUPPLIED, address: postUrl(11), resolution: RESOLUTION.READ, at: `${TODAY}T00:00:00Z` });
  const question = { record_type: "public_question", question_id: "q", value: { kind: "OBSERVED", subject: SUBJECT, original: "x?", provenance: { observerType: "SOURCE_ADAPTER_OBSERVED", seenBy: "A SOURCE ADAPTER — the text as the source holds it" } } };
  const keyword = { record_type: "keyword_signal", signal_id: "k" };
  const claim = { record_type: "public_question", question_id: "c", value: { ...question.value, kind: "CLIENT_CLAIM" } };
  assert.equal(new Set([route, lead, question, keyword].map((x) => x.record_type)).size, 4, "two kinds share a record type");
  assert.notEqual(claim.value.kind, question.value.kind);
  /* F91 admits only the source-verified question; every other kind is refused by its own name */
  assert.equal(refusalOf(question, { subject: SUBJECT }), null, "CONTROL: a source-verified question was refused");
  assert.equal(refusalOf(lead, { subject: SUBJECT }), REFUSAL.LEAD, "an AI lead counted as demand");
  assert.equal(refusalOf(supplied, { subject: SUBJECT }), REFUSAL.LEAD, "a supplied link counted as demand");
  assert.equal(refusalOf(keyword, { subject: SUBJECT }), REFUSAL.KEYWORD);
  assert.equal(refusalOf(claim, { subject: SUBJECT }), REFUSAL.CLIENT_CLAIM);
  assert.equal(refusalOf(route, { subject: SUBJECT }), REFUSAL.NOT_A_QUESTION);
  /* a lead holds an ADDRESS and how it was found — no field can carry provider prose; the provider's GENERATED question wording lives only in its
   * own record type (RR-170, C29/C31), never on a lead */
  assert.deepEqual(Object.keys(lead).sort(), ["kind", "lead_id", "meaning", "measurement_key", "plan_id", "query_id", "record_type", "recorded_at", "reference", "resolution", "sourceId", "status", "subject"].sort());
});

test("P6 · C22/C23 — supplied links are a lead route of their own and need no AI; a DEAD lead is never demand; with NEITHER route discovery is ABSENT — a state, never zero", () => {
  const W = world({ aiConnector: false });
  try {
    /* client-supplied links, no AI connection at all: the post is read and HELD — never admitted unread */
    const s = collect(W, { plan: planOf({ ai: null, suppliedLinks: [postUrl(11), postUrl(404), "https://elsewhere-forum.invalid/t/1"] }), responses: [{ items: [ONE] }, { items: [ONE] }], aiFlag: false });
    assert.equal(s.r.status, 0, s.out);
    assert.equal(s.aiCalls, 0, "a supplied-links run called a provider");
    assert.match(s.out, /discovery CLIENT_LINKS/);
    assert.match(s.out, /AI 0 · supplied 3\) — addresses only, UNVERIFIED: read 1 · DEAD 1 · NOT READ \(outside every approved source\) 1/);
    assert.equal(stored(W, "questions.jsonl").length, 0, "a supplied link was admitted without its original post being judged");
    assert.equal(stored(W, "held-for-judgement.jsonl").length, 1, "the supplied link's post was not read and held");
    assert.ok(!s.qsCalls.some((x) => String(x.params.ids).includes("elsewhere")), "an address outside every approved source was read");
    /* neither route: ABSENT — exit 0, NOT MEASURED, never zero; no request of any kind */
    const a = collect(W, { plan: planOf({ ai: null, suppliedLinks: [] }), aiFlag: false });
    assert.equal(a.r.status, 0, `discovery ABSENT is a state, not an error\n${a.out}`);
    assert.match(a.out, /discovery ABSENT/);
    assert.match(a.out, /NOT MEASURED, never zero demand/);
    assert.doesNotMatch(a.out, /observed questions 0\b/, "ABSENT was reported as zero");
    assert.deepEqual([a.aiCalls, a.qsCalls.length], [0, 0]);
    assert.equal(stored(W, "collection-runs.jsonl").at(-1).value.outcome, "DISCOVERY_ABSENT");
    /* every other part of the product runs unchanged for that client — the read-back still runs */
    const rb = readBack(W);
    assert.equal(rb.r.status, 0, rb.out);
  } finally { W.cleanup(); }
  assert.equal(discoveryRouteOf({ aiConnection: false, suppliedLinks: [] }), DISCOVERY.ABSENT);
  assert.equal(discoveryRouteOf({ aiConnection: true, suppliedLinks: ["x"] }), DISCOVERY.BOTH);
  /* the reader decides what is its own question post; an address only says WHERE */
  const r = idsFromAddresses([postUrl(7), `https://${SITE}.stackexchange.com/users/7`, "https://evil.invalid/questions/7", "not a url"], SITE);
  assert.deepEqual([r.onSource.map((x) => x.id), r.outside.length], [[7], 3]);
});

test("P7 · C24 — every provider call passes the paid-provider controls: the plan's call cap counted by the code, a ledger entry per call and per refusal, the F04 spend approval, the hard ceiling", () => {
  const W = world();
  try {
    { const k = connection(W, "--connect"); assert.equal(k.r.status, 0, k.out); }
    /* three formed queries, a cap of two: exactly two calls, two ledger entries */
    const c = collect(W, { plan: planOf({ ai: aiBlock({ queries: [FORMED[0].text, FORMED[1].text, FORMED[2].text], providerCalls: 2 }) }), outputs: [{ text: "" }, { text: "" }, { text: "" }] });
    assert.equal(c.r.status, 0, c.out);
    assert.equal(c.aiCalls, 2, "the run did not stop dead at the plan's provider-call cap");
    assert.equal(stored(W, "provider-ledger.jsonl").filter((e) => e.outcome === "CALLED").length, 2, "a provider call left no ledger entry");
    assert.match(c.out, /provider calls 2 of cap 2/);
    /* no recorded spend approval: the controls refuse the call, the refusal is on the ledger, the run stops */
    const before = stored(W, "provider-ledger.jsonl").length;
    const d = collect(W, { outputs: [providerSays(11)], responses: [{ items: [ONE] }, { items: [ONE] }], withholdApproval: true });
    assert.notEqual(d.r.status, 0, d.out);
    assert.equal(d.aiCalls, 0, "a call with no F04 spend approval reached the provider");
    assert.match(d.out, /stopped by PROVIDER_REFUSED:NOT_AUTHORISED_BY_F04/);
    const refusals = stored(W, "provider-ledger.jsonl").slice(before).filter((e) => e.outcome === "REFUSED");
    assert.equal(refusals.length, 1, "the refused call left no ledger entry");
    assert.equal(d.qsCalls.length, 0, "the source was read after the provider refused");
    /* the hard ceiling: a plan for more calls than it is refused before anything */
    const e = collect(W, { plan: planOf({ ai: aiBlock({ providerCalls: PROVIDER_CALL_CEILING + 1 }) }) });
    assert.match(e.out, /PLAN_EXCEEDS_PROVIDER_CALL_CEILING/);
    assert.equal(e.aiCalls, 0);
  } finally { W.cleanup(); }
});

test("P8 · C17/C14 — the client's credential value is never touched; the reusable model, its reader and its writer name no provider and no plan tier", () => {
  const W = world();
  try {
    { const k = connection(W, "--connect"); assert.equal(k.r.status, 0, k.out); }
    const c = collect(W, { outputs: [providerSays(11)], responses: [{ items: [ONE] }, { items: [ONE] }] });
    assert.equal(c.r.status, 0, c.out);
    for (const secret of [AI_SECRET, QS_SECRET]) {
      assert.ok(!c.out.includes(secret), "a credential value reached the run's output");
      assert.ok(!everyBatchByte(W).includes(secret), "a credential value reached a research record");
    }
  } finally { W.cleanup(); }
  /* the client's AI key is checked by PRESENCE only: the entry point never indexes the environment by its name, and the reusable model never
   * reads the environment at all */
  const bin = readFileSync(join(REPO, "bin/collect-public-questions.mjs"), "utf8");
  assert.doesNotMatch(bin, /process\.env\[\s*aiCredential\s*\]/, "the client's AI credential VALUE is read, measured or passed by the entry point");
  assert.match(bin, /Object\.hasOwn\(process\.env, aiCredential\)/, "CONTROL: the presence check itself is gone");
  for (const f of ["src/research/ai-connection.mjs", "src/research/ai-led-collection.mjs", "src/governance/governed-provider-call.mjs"]) assert.doesNotMatch(readFileSync(join(REPO, f), "utf8"), /process\.env/, `${f} reads the environment`);
  /* the connection entry point reads the environment only for its root index and its write permission — never any variable by name */
  assert.doesNotMatch(readFileSync(join(REPO, "bin/ai-connection.mjs"), "utf8"), /process\.env\[/, "bin/ai-connection.mjs indexes the environment by a name");
  const reusable = ["src/research/ai-connection.mjs", "src/research/ai-led-collection.mjs", "bin/ai-connection.mjs", "src/research/ai-providers/index.mjs", "src/governance/governed-provider-call.mjs"];
  const NAMES = /\b(anthropic|openai|gemini|google|claude|chatgpt|gpt-\d|copilot|mistral|perplexity|bing)\b|\b(free|pro|plus|premium|enterprise|team|max) (plan|tier|subscription)\b/i;
  for (const f of reusable) {
    const code = readFileSync(join(REPO, f), "utf8");
    assert.ok(!NAMES.test(code), `${f} names a provider or a plan tier: ${code.match(NAMES)?.[0]}`);
    assert.ok(!/\bfree\b/i.test(code), `${f} carries the word "free"`);
  }
  assert.ok(NAMES.test("const P = 'openai';"), "CONTROL: a planted provider name was not seen");
});

test("P9 · F77 — the paid-provider census sees the registry-fed gate: REAL exactly when the AI-provider registry holds an adapter; today none", () => {
  const real = censusOf(productionFiles());
  const site = real.paidGateSites.find((x) => x.site.startsWith("src/governance/governed-provider-call.mjs:"));
  assert.ok(site, "the AI-led run's gate site was not seen by the census");
  assert.equal(site.provider, "REGISTRY_EMPTY");
  assert.equal(real.realPaidProviders, 0);
  assert.equal(real.ok, true);
  const planted = { "bin/x.mjs": "const g = createPaidProviderGate({ providers: { [id]: AI_PROVIDER_ADAPTERS[id].create() } });" };
  assert.equal(censusOf(planted, { registrySize: 1 }).realPaidProviders, 1, "CONTROL: a registry holding an adapter was not counted REAL");
  assert.equal(censusOf(planted, { registrySize: 0 }).realPaidProviders, 0);
});

test("P10 · RR-161 C25–C26 — refused BY NAME, with no provider call: a record WITHDRAWN by a later owner record, an EXPIRED authorization; and the HARD BUDGET stops the run", () => {
  const W = world();
  try {
    { const k = connection(W, "--connect"); assert.equal(k.r.status, 0, k.out); }
    /* the record is no longer current: a LATER owner record for the same proposition withdraws the capability (the register resolves the latest) */
    const p1 = planOf();
    const prop = `OWNER_PROVIDER_RECORD_FIXTURE_r${++n}`;
    p1.discovery.ai.providerRecord = prop;
    const bytes = JSON.stringify(p1, null, 2);
    writeFileSync(batchFile(W, "collection-plan.json"), bytes);
    const g = green(planSha256(bytes), { provider: providerText(), propositionId: prop });
    const gj = JSON.parse(readFileSync(g.path, "utf8"));
    /* the EARLIER record (issued 1 Jan) permits; the LATER one (issued today) withdraws — the register resolves the later one */
    const withdrawn = providerText({ capability: "NOT_PERMITTED" });
    gj.also[0].record.issuedAt = "2026-01-01";
    gj.also.push({ record: authorityRecord(`AlmiVisibility_OWNER_DECISION_${TODAY}_FIXTURE_PROVIDER_WITHDRAWN_r${n}.md`, prop, withdrawn), text: withdrawn });
    writeFileSync(g.path, JSON.stringify(gj));
    attach(W, "INPUT_PATH", inputPathRef(g.path), TENANT);
    const aiCalls = file("ai-calls.jsonl", ""), qsCalls = file("qs-calls.jsonl", "");
    const w = spawn(W, ["bin/collect-public-questions.mjs", `--subject=${SUBJECT}`, `--research-batch=${BATCH}`, `--green=${g.id}`, `--tenant=${TENANT}`, "--actor=actor:cc", "--ai-connection", "--confirm"], {
      [KEY_NAME]: QS_SECRET, [AI_KEY]: AI_SECRET, ALMIVISIBILITY_TEST_TRANSPORT: join(REPO, "test", "fixtures", "fake-question-source-transport.mjs"), ALMIVISIBILITY_TEST_GREEN: g.path,
      ALMIVISIBILITY_TEST_PROVIDER: join(REPO, "test", "fixtures", "fake-ai-provider.mjs"), FAKE_QS_SCENARIO: file("qs.json", { responses: [] }), FAKE_QS_CALLS: qsCalls,
      FAKE_AI_SCENARIO: file("ai.json", { outputs: [providerSays(11)], tenantId: TENANT }), FAKE_AI_CALLS: aiCalls });
    const wl = w.out.split(/\r?\n/).find((l) => /REFUSED before any request: /.test(l)) ?? "";
    assert.match(wl, /PROVIDER_CAPABILITY_NOT_PERMITTED/, `a record withdrawn by a later owner record still permitted the call\n${w.out}`);
    assert.deepEqual([lines(aiCalls).length, lines(qsCalls).length], [0, 0], "a provider or source call was made under a withdrawn record");
    /* the plan's authorization has expired */
    const e = collect(W, { plan: planOf({ ai: aiBlock({ expiresOn: "2020-01-01" }) }), outputs: [providerSays(11)] });
    const el = e.out.split(/\r?\n/).find((l) => /REFUSED before any request: /.test(l)) ?? "";
    assert.match(el, /PLAN_AUTHORIZATION_EXPIRED/, `an expired authorization was not refused by name\n${e.out}`);
    assert.deepEqual([e.aiCalls, e.qsCalls.length], [0, 0]);
    /* the hard budget: two calls planned at a per-call charge of 0.6 under a budget of 1.0 — the second is refused, the run STOPS, both ledgered */
    const before = stored(W, "provider-ledger.jsonl").length;
    const b = collect(W, { plan: planOf({ ai: aiBlock({ queries: [FORMED[0].text, FORMED[1].text], providerCalls: 2, budget: { amount: 1, currency: "USD" }, pricePerCall: { amount: 0.6, currency: "USD" } }) }), outputs: [{ text: "" }, { text: "" }] });
    assert.equal(b.aiCalls, 1, "a call over the hard budget was made");
    assert.match(b.out, /stopped by PROVIDER_REFUSED:BUDGET_WOULD_BE_EXCEEDED/, `the budget did not stop the run by name\n${b.out}`);
    assert.equal(b.qsCalls.length, 0, "the source was read after the budget stopped the run");
    assert.deepEqual(stored(W, "provider-ledger.jsonl").slice(before).map((x) => x.outcome), ["CALLED", "REFUSED"], "the budget stop was not ledgered");
  } finally { W.cleanup(); }
});

test("P11 · RR-161 C25 — a plan naming the provider whose adapter is BUILT but NOT REGISTERED is refused by that name, its options checked; no call", () => {
  const W = world();
  try {
    { const k = connection(W, "--connect"); assert.equal(k.r.status, 0, k.out); }
    const opts = { model: "fixture-model-1", toolType: "web_search_20260318", maxSearchesPerCall: 3, maxOutputTokens: 512 };
    const rec = providerText({ provider: "anthropic" });
    const run = (providerOptions) => collect(W, { plan: planOf({ ai: aiBlock({ providerId: "anthropic", providerOptions }) }), provider: rec, outputs: [providerSays(11)], env: { ALMIVISIBILITY_TEST_PROVIDER: "" } });
    const ok = run(opts);
    const okLine = ok.out.split(/\r?\n/).find((l) => /REFUSED before any request: /.test(l)) ?? "";
    assert.match(okLine, /PROVIDER_ADAPTER_BUILT_NOT_REGISTERED/, `a built-but-unregistered adapter was not refused by that name\n${ok.out}`);
    assert.doesNotMatch(okLine, /PROVIDER_ADAPTER_ABSENT|PROVIDER_OPTIONS_/, "valid options were refused, or the built adapter read as absent");
    const bad = run({ ...opts, maxSearchesPerCall: 99 });
    const badLine = bad.out.split(/\r?\n/).find((l) => /REFUSED before any request: /.test(l)) ?? "";
    assert.match(badLine, /PROVIDER_OPTIONS_SEARCH_CAP/, "the built adapter's options check did not run");
    assert.deepEqual([ok.aiCalls, ok.qsCalls.length, bad.aiCalls, bad.qsCalls.length], [0, 0, 0, 0], "a call was made");
  } finally { W.cleanup(); }
});

test("TRAIL · the production audit trail is byte-identical after every proof in this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE, "a confined proof wrote to the production trail");
  rmSync(TMP, { recursive: true, force: true });
});
