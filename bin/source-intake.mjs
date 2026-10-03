#!/usr/bin/env node
/**
 * F16 · SOURCE INTAKE — keep one retrieval from one ADMITTED source in one client's own declared research batch; count-only (RR-118).
 *
 *   node bin/source-intake.mjs --tenant=<id> --actor=<id> --subject=<id> --research-batch=<id> --source=<declaration.json>
 *        --retrieval=<retrieval.json> [--confirm]
 *
 * 🔴 THIS ENTRY POINT FETCHES NOTHING. It takes a source declaration and one retrieval already in hand. A source whose storage, attribution and
 * licence terms are not each declared VERIFIED_FROM_PRIMARY_SOURCE with a citation is REFUSED and nothing it returns is kept
 * (src/research/source-adapter.mjs). Questions go to questions.jsonl; generated keyword signals to keyword-signals.jsonl — two stores, never
 * merged. Every resource is decided by the scope gate for THIS tenant first. Without --confirm nothing is written. Names no source, no product.
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
import { recordsFrom, sampleLines, KEYWORD_SIGNAL } from "../src/research/source-adapter.mjs";
import { ADAPTERS } from "../src/research/adapters/index.mjs";
import { BATCH_PURPOSES } from "../src/research/human-observation.mjs";
import { RECORD_TYPE, PILOT_MARK } from "../src/research/public-questions.mjs";
import { productFromArgvOrExit } from "../src/product-cli.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { readProductAxes } from "../src/discovery/context-axes-reader.mjs";
import { researchRoutes } from "../src/research/research-routes.mjs";
import { intakeFromRoute } from "../src/research/lead-intake.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch"), SOURCE = arg("source"), RETRIEVAL = arg("retrieval"), ADAPTER = arg("adapter"), RECHECK = arg("recheck"), RELEVANCE = arg("relevance");
if (!SUBJECT || !BATCH || !RETRIEVAL || (!SOURCE === !ADAPTER)) {
  console.error("usage: node bin/source-intake.mjs --subject=<id> --research-batch=<id> (--source=<declaration.json> | --adapter=<id> [--recheck=<recorded.json>]) --retrieval=<json> --relevance=<profile.json> [--confirm] — nothing read, nothing written");
  process.exit(2);
}
const inputs = [[SOURCE, "--source"], [RETRIEVAL, "--retrieval"], [RECHECK, "--recheck"], [RELEVANCE, "--relevance"]].filter(([p]) => p).map(([p, label]) => RESOURCES.inputPath(p, label));
/* RR-146 route mode reads F13's evidence too (the product's facts and its crawl partition) — decided here with everything else */
const SCOPE = scopedEntryPoint({ entry: "bin/source-intake.mjs", governed: true, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH), ...inputs, ...(arg("route") ? [RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID), ...(arg("product") && arg("product") !== SUBJECT ? [RESOURCES.subject(arg("product"))] : [])] : [])] });

const index = rootIndexFor(process.env);
const store = lookupStore(index, "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}`); process.exit(3); }
const batchDir = join(store.dir, BATCH);
if (!existsSync(batchDir)) { console.error("🔴 REFUSED — RESEARCH_BATCH_ABSENT: the declared research batch has no directory in the RESEARCH store"); process.exit(3); }
const manifestPath = join(batchDir, "batch.json");
const declaredPurpose = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8"))?.purpose ?? null : null;
if (declaredPurpose !== null && !BATCH_PURPOSES.includes(declaredPurpose)) { console.error("🔴 REFUSED — BATCH_PURPOSE_UNDECLARED: the batch manifest names a purpose no rule declares; nothing written"); process.exit(3); }
const site = (lookupSubject(index, SUBJECT).entry?.connectors ?? []).find((c) => c.kind === "PUBLIC_SITE");
const origin = site?.reaches?.find((x) => x.resourceKind === "SITE_ORIGIN")?.resourceRef ?? null;

const adapter = ADAPTER ? ADAPTERS[ADAPTER] : null;
if (ADAPTER && !Object.hasOwn(ADAPTERS, ADAPTER)) { console.error("🔴 REFUSED — ADAPTER_UNKNOWN: no adapter of that id is registered; nothing read, nothing written"); process.exit(3); }
const decl = adapter ? adapter.DECLARATION : JSON.parse(readFileSync(SOURCE, "utf8"));
const input = JSON.parse(readFileSync(RETRIEVAL, "utf8"));
const retrieval = adapter ? adapter.retrievalFrom(input, RECHECK ? JSON.parse(readFileSync(RECHECK, "utf8")) : null) : input;
/* RR-126: the subject's DECLARED relevance profile (data, never code); without one, nothing a source returns may enter this batch */
const relevance = RELEVANCE ? JSON.parse(readFileSync(RELEVANCE, "utf8")) : null;
/* RR-146 · ROUTE MODE: --route names one of the product's own research routes (src/research/research-routes.mjs, from F13's dimensions).
 * Every hit becomes a LEAD first (leads.jsonl, never a question); attribution and duplicates are refused before anything is kept. */
const ROUTE_ID = arg("route");
let routeIntake = null;
if (ROUTE_ID) {
  const product = await productFromArgvOrExit(process.argv, { usage: "--product=<id> --route=<route id>", scope: SCOPE });
  /* the product is THIS subject's only when the subject declares the product's own fact registry among its members */
  const members = lookupSubject(index, SUBJECT).entry?.members ?? [];
  if (!members.some((m) => m.resourceKind === "FACT_REGISTRY" && String(m.resourceRef).split(":").pop().split("/")[0] === product?.productId)) { console.error("🔴 REFUSED — PRODUCT_IS_NOT_THIS_SUBJECTS: the subject does not declare this product's fact registry; nothing written"); process.exit(3); }
  const { axes } = await readProductAxes({ product, tenantId: SCOPE.tenantId, resolve: createTenantResolver() });
  const plan = researchRoutes({ subject: SUBJECT, product, axes });
  const route = Array.isArray(plan.routes) ? plan.routes.find((x) => x.route_id === ROUTE_ID) : null;
  if (!route) { console.error(`🔴 REFUSED — ROUTE_UNKNOWN: no research route of that id for this product (${plan.routes === "NOT MEASURED" ? `routes NOT MEASURED — missing ${plan.refusals.join("; ")}` : `${plan.routes.length} route(s)`}); nothing written`); process.exit(3); }
  const qFile = join(batchDir, "questions.jsonl");
  const existing = existsSync(qFile) ? createJsonlStore(qFile).readAll().filter((x) => x.record_type === RECORD_TYPE).map((x) => x.question_id) : [];
  routeIntake = intakeFromRoute({ route, decl, retrieval, subject: SUBJECT, origin, relevance, existingQuestionIds: existing, dataPurpose: declaredPurpose });
}
const result = routeIntake
  ? { admitted: !routeIntake.sourceRefused, refusals: routeIntake.sourceRefused ?? [], retrieved: routeIntake.retrieved, records: [...routeIntake.questions, ...(routeIntake.keywordIdeas ?? [])], refused: routeIntake.refused }
  : recordsFrom(decl, retrieval, { subject: SUBJECT, origin, dataPurpose: declaredPurpose, relevance });
console.log("F16 · SOURCE INTAKE — this tenant's subject only, one retrieval in hand, count-only; nothing fetched");
for (const l of sampleLines(decl, result)) console.log(`  ${l}`);
if (declaredPurpose === "TEST_PILOT") console.log(`  ${PILOT_MARK} — this batch is declared TEST_PILOT: not the demand of any country, not global demand, not a production client result`);
if (!result.admitted) process.exit(3);

const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
if (!permission.mayWrite) { console.log("  NOT WRITTEN — no --confirm: 0 records kept"); process.exit(0); }
const instant = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const append = (records, file, action) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope,
  repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(join(batchDir, file)), records,
  targetClass: "GENERATED_CONFIG", action, occurredAt: instant, correlationId: `run:source-intake:${instant}`, discipline: "APPEND_IF_NEW",
}));
let kept = 0;
/* the leads of a route run are kept in their own store, first, and are never counted as kept questions */
if (routeIntake && routeIntake.leads.length) {
  const g = append(routeIntake.leads, "leads.jsonl", "APPEND_RESEARCH_LEADS");
  if (g.outcome !== "COMMITTED" && g.outcome !== "ALREADY_COMMITTED") { console.error(`  🔴 ${g.outcome} — ${routeIntake.leads.length} lead(s) did NOT persist; nothing else written`); process.exit(1); }
  console.log(`  LEADS ${routeIntake.leads.length} kept apart in leads.jsonl — leads, not questions`);
}
for (const [type, file, action] of [[RECORD_TYPE, "questions.jsonl", "APPEND_SOURCE_QUESTIONS"], [KEYWORD_SIGNAL, "keyword-signals.jsonl", "APPEND_KEYWORD_SIGNALS"]]) {
  const records = result.records.filter((r) => r.record_type === type);
  if (records.length === 0) continue;
  let governed;
  try { governed = append(records, file, action); } catch (e) {
    console.error(`  🔴 REFUSED (${e.code ?? e.name}) — ${records.length} ${type} record(s) did NOT persist; ${kept} kept before it`);
    process.exit(1);
  }
  if (governed.outcome !== "COMMITTED" && governed.outcome !== "ALREADY_COMMITTED") {
    console.error(`  🔴 ${governed.outcome} — ${records.length} ${type} record(s) did NOT persist; ${kept} kept before it`);
    process.exit(1);
  }
  kept += records.length;
}
console.log(`  KEPT ${kept} of ${result.retrieved === "NOT MEASURED" ? "NOT MEASURED" : result.retrieved} — written through the governed boundary`);
