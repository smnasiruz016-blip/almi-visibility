#!/usr/bin/env node
/**
 * 🔴 F91 · THE GOVERNED QUESTION-TO-PAGE-CANDIDATE WRITER AND ITS READBACK (Acceptance Amendment 2, _handoffs fff60df).
 *
 *   node bin/demand-connect.mjs --subject=<id> --product=<id> --research-batch=<id> --on=YYYY-MM-DD [--drafts=<drafts.json>]
 *        [--coverage-judgements=<judgements.json>] [--confirm]
 *
 * Reads the batch's own stored records (questions, leads, keyword signals, research-derived questions and their relevance assessments) and
 * the product's F91 number 1. Each draft joins one admitted question of THIS subject — OBSERVED, or RESEARCH-DERIVED and assessed RELEVANT
 * (Amendment 3 C16) — to one possible combination (its page candidate) and to one underlying need (src/page/demand-connection.mjs). Its
 * answer is judged claim by claim (C17); there is no checker field. 🔴 C14: for EVERY need, a coverage record is written — F33 C8's grouped-need
 * decision over THIS tenant's existing pages (read once, through F34's loader) and the recorded per-question coverage judgements. It writes
 * the batch's planning.jsonl only through the governed boundary (APPEND_PLANNING_DEMAND), only with --confirm. Nothing is fetched. The
 * readback prints counts only, and nothing here is a page.
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
import { NOT_MEASURED } from "../src/page/page-opportunities.mjs";
import { connectQuestions, readConnections, coverageRecords } from "../src/page/demand-connection.mjs";
import { coverageJudgementRecords } from "../src/page/grouped-need-coverage.mjs";
import { readExistingPagePopulation } from "../src/page/existing-page-population.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { SITEMAP_BATCH_ID } from "../src/adapter/sitemap-subject.mjs";
import { RESEARCH_DERIVED_RECORD, ASSESSMENT_RECORD } from "../src/research/research-derived.mjs";
import { overturnedIds, asAt } from "../src/research/meaning-judgement.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch"), ON = arg("on"), DRAFTS = arg("drafts"), JUDGED = arg("coverage-judgements");
if (!SUBJECT || !BATCH || !ON) { console.error("usage: node bin/demand-connect.mjs --subject=<id> --product=<id> --research-batch=<id> --on=YYYY-MM-DD [--drafts=<json>] [--confirm] — nothing read, nothing written"); process.exit(2); }
const SCOPE = scopedEntryPoint({ entry: "bin/demand-connect.mjs", governed: true, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH), ...(DRAFTS ? [RESOURCES.inputPath(DRAFTS, "--drafts")] : []), ...(JUDGED ? [RESOURCES.inputPath(JUDGED, "--coverage-judgements")] : []),
  /* C14 — the coverage record reads THIS tenant's partition of the stored observation batch, declared here like every read (as F34 does) */
  RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID), RESOURCES.collectionPartition("SITEMAP_COLLECTION", SITEMAP_BATCH_ID), ...(arg("product") && arg("product") !== SUBJECT ? [RESOURCES.subject(arg("product"))] : [])] });

const index = rootIndexFor(process.env);
const store = lookupStore(index, "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}`); process.exit(3); }
const batchDir = join(store.dir, BATCH);
if (!existsSync(batchDir)) { console.error("🔴 REFUSED — RESEARCH_BATCH_ABSENT: the declared research batch has no directory in the RESEARCH store"); process.exit(3); }
const product = await productFromArgvOrExit(process.argv, { usage: "--product=<id>", scope: SCOPE });
const members = lookupSubject(index, SUBJECT).entry?.members ?? [];
if (!members.some((m) => m.resourceKind === "FACT_REGISTRY" && String(m.resourceRef).split(":").pop().split("/")[0] === product?.productId)) { console.error("🔴 REFUSED — PRODUCT_IS_NOT_THIS_SUBJECTS: the subject does not declare this product's fact registry; nothing written"); process.exit(3); }

const rowsOf = (f) => (existsSync(join(batchDir, f)) ? createJsonlStore(join(batchDir, f)).readAll() : []);
const records = ["questions.jsonl", "leads.jsonl", "keyword-signals.jsonl"].flatMap(rowsOf);
/* C16: the batch's research-derived questions, and F16's relevance assessments that decide which of them may be connected */
records.push(...rowsOf("research-derived-questions.jsonl").filter((r) => r?.record_type === RESEARCH_DERIVED_RECORD));
const assessments = rowsOf("relevance-assessments.jsonl").filter((r) => r?.record_type === ASSESSMENT_RECORD);
/* RR-158 §5: the batch's meaning judgements — an overturned question is refused and leaves every count */
const judgements = rowsOf("meaning-judgements.jsonl");
const overturned = overturnedIds(judgements);
const file = join(batchDir, "planning.jsonl");
const held = () => rowsOf("planning.jsonl");
const { plan } = await readProductPlan(product);
const officialSites = Array.isArray(product.officialSites) ? product.officialSites : [];

console.log("F91 · QUESTION-TO-PAGE-CANDIDATE CONNECTION — this subject's product only, from stored records; count-only; nothing fetched");
console.log(`  page candidates  ${plan.possible.value === NOT_MEASURED ? `NOT MEASURED — missing ${plan.possible.missing}` : `${plan.possible.value} possible combination(s) — candidates only, never pages`}`);
console.log(`  stored records   ${records.length} read from the batch (questions, leads, keyword signals, research-derived questions) · relevance assessments ${assessments.length} · official sites declared ${officialSites.length}${officialSites.length ? "" : " (turn order — not a gap)"}`);
let toWrite = [];
if (DRAFTS) {
  const drafts = JSON.parse(readFileSync(DRAFTS, "utf8"));
  const r = connectQuestions({ subject: SUBJECT, possible: plan.possible, records, drafts, existing: held(), officialSites, on: ON, overturned, assessments });
  const codes = r.refused.reduce((m, x) => ((m[x.code] = (m[x.code] ?? 0) + 1), m), {});
  console.log(`  drafts           ${drafts.length} read · ${r.records.filter((x) => x.record_type === "planning_demand").length} connected · refused ${r.refused.length}${r.refused.length ? ` (${Object.entries(codes).map(([k, n]) => `${k} ${n}`).join(" · ")})` : ""}`);
  toWrite = r.records;
}
/* F33 C8 · ruling 3(a): recorded per-question coverage judgements — a method or an agent, never an approval, never "human" */
if (JUDGED) {
  const j = coverageJudgementRecords(JSON.parse(readFileSync(JUDGED, "utf8")), { on: ON });
  console.log(`  coverage judgements ${j.records.length} recorded · refused ${j.refused.length}${j.refused.length ? ` (${[...new Set(j.refused)].join(" · ")})` : ""}`);
  toWrite = [...toWrite, ...j.records];
}
/* 🔴 C14 · THE COVERAGE RECORD, FOR EVERY NEED — after the connections and their answers, over THIS tenant's existing pages */
const existing = readExistingPagePopulation({ scope: SCOPE, resolve: createTenantResolver() });
const after = [...held(), ...toWrite];
const coverage = coverageRecords({ subject: SUBJECT, rows: after, tenantId: SCOPE.tenantId, population: existing.population, judgements: after.filter((x) => x?.record_type === "coverage_judgement"), on: ON, overturned });
const heldKeys = new Set(held().map((x) => x.measurement_key));
const freshCoverage = coverage.filter((c) => !heldKeys.has(c.measurement_key));
console.log(`  existing pages   ${existing.population ? `${existing.population.pages.length} of this tenant (coverage ${existing.population.coverageState})` : `UNAVAILABLE (${existing.fault}) — every need's coverage is REFUSED, never read as empty`}`);
console.log(`  coverage records ${coverage.length} need(s), one record each (${freshCoverage.length} new) · ${Object.entries(coverage.reduce((m, c) => ((m[c.coverage] = (m[c.coverage] ?? 0) + 1), m), {})).map(([k, n]) => `${k} ${n}`).join(" · ") || "none"}`);
toWrite = [...toWrite, ...freshCoverage];
const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
if (toWrite.length && !permission.mayWrite) console.log(`  NOT WRITTEN — no --confirm: 0 of ${toWrite.length} record(s) kept`);
if (toWrite.length && permission.mayWrite) {
  const instant = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const governed = executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(file), records: toWrite,
    targetClass: "GENERATED_CONFIG", action: "APPEND_PLANNING_DEMAND", occurredAt: instant, correlationId: `run:demand-connect:${instant}`, discipline: "APPEND_IF_NEW" }));
  if (governed.outcome !== "COMMITTED" && governed.outcome !== "ALREADY_COMMITTED") { console.error(`  🔴 ${governed.outcome} — ${toWrite.length} record(s) did NOT persist`); process.exit(1); }
  console.log(`  kept             ${toWrite.length} record(s) in the batch's planning store (${governed.outcome})`);
}
const rb = readConnections(held(), { overturned });
console.log(`  ${asAt(judgements)}`);
console.log(`  overturned       ${rb.counts.overturned} connection(s) whose question was overturned — left out of every count`);
console.log(`  readback         ${rb.counts.questions} connected question(s) · ${rb.counts.needs} underlying need(s) · ${rb.counts.pageCandidates} page candidate(s)`);
console.log(`  coverage         COVERED ${rb.counts.covered} · COVERED IN PART ${rb.counts.coveredPartial} · HELD (coverage undecided) ${rb.counts.heldCoverage} · HELD (central answer unsupported) ${rb.counts.heldAnswer} · NOT COVERED ${rb.counts.notCovered} — handed on to F35 (R3); nothing here is a page`);
console.log(`  needs without a coverage record ${rb.counts.withoutCoverageRecord}`);
