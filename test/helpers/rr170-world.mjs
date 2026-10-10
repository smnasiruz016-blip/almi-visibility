/**
 * RR-170 · the confined world for R1's proofs (F16 Acceptance Amendment 5, C27–C32) — rr159's helper block, LIFTED verbatim from
 * test/rr159-ai-led-discovery.test.mjs (re-rooted one folder deeper, its own temp folder), so both files drive the SAME production entry points
 * in the SAME kind of confined copy of the data root, with the FAKE provider and the FAKE source transport only. Plus one runner for the
 * research-derived intake entry point. 🔴 Every question here is a FIXTURE.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { declaredWorld, inputPathRef, DATA_ROOT } from "./declared-world.mjs";
import { contentHashOf } from "../../src/authority/corpus.mjs";
import { planSha256, AI_PLAN_KIND } from "../../src/research/collection.mjs";
import { formResearchQueries, PROVIDER_CAPABILITY } from "../../src/research/ai-connection.mjs";
import { API_ORIGIN } from "../../src/research/adapters/stack-exchange.mjs";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const TMP = join(tmpdir(), `almi-rr170-${process.pid}`);
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
  /* RR-243 (F78 Amendment 1, C9): the run writes its cost into its tenant's own declared ledger, so the tenant holds one here too */
  for (const [k, r] of [...ENTRY.members.map((m) => [m.resourceKind, m.resourceRef]), ["SITE_ORIGIN", API_ORIGIN], ["SITE_ORIGIN", AI_ORIGIN], ["COST_LEDGER", `cost-ledger/${TENANT}`]]) attach(W, k, r, TENANT);
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

/** RR-170 · one run of the research-derived intake entry point: writes the batch's route-2 results and assessment drafts, then spawns it. */
const intake = (W, { results = [], drafts = [], confirm = true, env = {} } = {}) => {
  writeFileSync(batchFile(W, "route2-results.json"), JSON.stringify(results));
  writeFileSync(batchFile(W, "relevance-assessment-drafts.json"), JSON.stringify(drafts));
  return spawn(W, ["bin/research-derived-intake.mjs", `--subject=${SUBJECT}`, `--research-batch=${BATCH}`, `--tenant=${TENANT}`, "--actor=actor:cc", ...(confirm ? ["--confirm"] : [])], env);
};
const tmpCleanup = () => rmSync(TMP, { recursive: true, force: true });

export { REPO, TRAIL, trailSha, TRAIL_BEFORE, SUBJECT, TODAY, TENANT, DESCRIPTOR, BATCH, SITE, FORMED, SENTINEL, postUrl, file, world, providerText, aiBlock, planOf,
  post, ONE, spawn, batchFile, stored, connection, collect, judge, readBack, intake, tmpCleanup, readdirSync };
