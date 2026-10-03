#!/usr/bin/env node
/**
 * 🔴 F62 · THE GOVERNED APPLICABILITY WRITER AND ITS READBACK (RR-150; acceptance _handoffs a5ec9f1).
 *
 *   node bin/applicability-assess.mjs --subject=<id> --product=<id> --research-batch=<id> --on=YYYY-MM-DD
 *        [--drafts=<drafts.json>] [--confirmations=<confirmations.json>] [--drafted-by=<id>] [--confirm]
 *
 * DRAFTS become PROPOSED assessments of the product's DERIVED checks (src/research/applicability-assessment.mjs), each resting on a stored
 * record of that exact check, CURRENT by F45; CONFIRMATIONS are accepted only from a checker DECLARED A PERSON (F46 C3) — today the
 * roster is empty, so every confirmation is refused. Both are kept in the research batch's applicability.jsonl through the governed
 * boundary, only with --confirm. Nothing is fetched. The readback prints counts only: CONFIRMED · PROPOSED · UNKNOWN, and the guidance
 * F16 may use (CONFIRMED REQUIRED/ACCEPTED only). An assessment is never a question and never a page.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor, createTenantResolver } from "../src/tenancy/resolver.mjs";
import { lookupStore, lookupSubject } from "../src/tenancy/root-registry.mjs";
import { writePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { productFromArgvOrExit } from "../src/product-cli.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { NO_DECLARED_PERSON_CHECKERS } from "../src/facts/citation-audit.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { readDerivedDeclaration } from "../src/research/applicability-declaration-reader.mjs";
import { draftAssessments, confirmAssessment, readback, confirmedGuidance, ASSESSMENT_RECORD, CONFIRMATION_RECORD } from "../src/research/applicability-assessment.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch"), ON = arg("on"), DRAFTS = arg("drafts"), CONFIRMATIONS = arg("confirmations");
if (!SUBJECT || !BATCH || !ON) { console.error("usage: node bin/applicability-assess.mjs --subject=<id> --product=<id> --research-batch=<id> --on=YYYY-MM-DD [--drafts=<json>] [--confirmations=<json>] [--confirm] — nothing read, nothing written"); process.exit(2); }
const inputs = [[DRAFTS, "--drafts"], [CONFIRMATIONS, "--confirmations"]].filter(([p]) => p).map(([p, label]) => RESOURCES.inputPath(p, label));
const SCOPE = scopedEntryPoint({ entry: "bin/applicability-assess.mjs", governed: true, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH), RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID), ...inputs, ...(arg("product") && arg("product") !== SUBJECT ? [RESOURCES.subject(arg("product"))] : [])] });

const index = rootIndexFor(process.env);
const store = lookupStore(index, "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}`); process.exit(3); }
const batchDir = join(store.dir, BATCH);
if (!existsSync(batchDir)) { console.error("🔴 REFUSED — RESEARCH_BATCH_ABSENT: the declared research batch has no directory in the RESEARCH store"); process.exit(3); }
const product = await productFromArgvOrExit(process.argv, { usage: "--product=<id>", scope: SCOPE });
/* the product is THIS subject's only when the subject declares the product's own fact registry among its members — no tenant crossover */
const members = lookupSubject(index, SUBJECT).entry?.members ?? [];
if (!members.some((m) => m.resourceKind === "FACT_REGISTRY" && String(m.resourceRef).split(":").pop().split("/")[0] === product?.productId)) { console.error("🔴 REFUSED — PRODUCT_IS_NOT_THIS_SUBJECTS: the subject does not declare this product's fact registry; nothing written"); process.exit(3); }

const facts = (await loadRegistry(product.factsDir, product.productId)).records;
const declaration = await readDerivedDeclaration({ product, tenantId: SCOPE.tenantId, resolve: createTenantResolver(), on: ON });
if (!declaration.derived) { console.error(`🔴 REFUSED — DECLARATION_NOT_DERIVED: missing ${declaration.missing.join("; ")}`); process.exit(3); }
const file = join(batchDir, "applicability.jsonl");
const held = () => (existsSync(file) ? createJsonlStore(file).readAll() : []);
const persons = NO_DECLARED_PERSON_CHECKERS;

console.log("F62 · APPLICABILITY WRITER — this subject's product only, from stored records; count-only; nothing fetched");
let toWrite = [];
if (DRAFTS) {
  const drafts = JSON.parse(readFileSync(DRAFTS, "utf8"));
  const r = draftAssessments({ subject: SUBJECT, declaration, facts, drafts, on: ON, existingIds: held().filter((x) => x.record_type === ASSESSMENT_RECORD).map((x) => x.assessment_id), draftedBy: arg("drafted-by") ?? "actor:cc" });
  const codes = r.refused.reduce((m, x) => ((m[x.code] = (m[x.code] ?? 0) + 1), m), {});
  console.log(`  drafts           ${drafts.length} read · ${r.assessments.length} PROPOSED assessment(s) admitted · refused ${r.refused.length}${r.refused.length ? ` (${Object.entries(codes).map(([k, n]) => `${k} ${n}`).join(" · ")})` : ""}`);
  toWrite = toWrite.concat(r.assessments);
}
if (CONFIRMATIONS) {
  const wanted = JSON.parse(readFileSync(CONFIRMATIONS, "utf8"));
  const all = held().concat(toWrite);
  const results = wanted.map((w) => confirmAssessment({ assessment: all.find((a) => a.record_type === ASSESSMENT_RECORD && a.assessment_id === w.assessmentId), checker: w.checker, persons, facts, on: ON, existingIds: all.filter((x) => x.record_type === CONFIRMATION_RECORD).map((x) => x.confirmation_id) }));
  const codes = results.filter((x) => x.refused).reduce((m, x) => ((m[x.refused] = (m[x.refused] ?? 0) + 1), m), {});
  console.log(`  confirmations    ${wanted.length} read · ${results.filter((x) => x.record).length} accepted · refused ${results.filter((x) => x.refused).length}${Object.keys(codes).length ? ` (${Object.entries(codes).map(([k, n]) => `${k} ${n}`).join(" · ")})` : ""} · checkers declared a person: ${persons.length}`);
  toWrite = toWrite.concat(results.filter((x) => x.record).map((x) => x.record));
}

const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
if (toWrite.length && !permission.mayWrite) console.log(`  NOT WRITTEN — no --confirm: 0 of ${toWrite.length} record(s) kept`);
if (toWrite.length && permission.mayWrite) {
  const instant = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const governed = executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(file), records: toWrite,
    targetClass: "GENERATED_CONFIG", action: "APPEND_APPLICABILITY_ASSESSMENTS", occurredAt: instant, correlationId: `run:applicability-assess:${instant}`, discipline: "APPEND_IF_NEW" }));
  if (governed.outcome !== "COMMITTED" && governed.outcome !== "ALREADY_COMMITTED") { console.error(`  🔴 ${governed.outcome} — ${toWrite.length} record(s) did NOT persist`); process.exit(1); }
  console.log(`  kept             ${toWrite.length} record(s) in the batch's applicability store (${governed.outcome})`);
}

const rb = readback({ declaration, records: held(), persons });
console.log(`  readback         ${rb.counts.checks} derived check(s): CONFIRMED ${rb.counts.CONFIRMED} · PROPOSED ${rb.counts.PROPOSED} · UNKNOWN ${rb.counts.UNKNOWN} — UNKNOWN is never zero; a PROPOSED outcome is not a verdict`);
console.log(`  guidance for F16 ${confirmedGuidance(rb).length} CONFIRMED REQUIRED/ACCEPTED check(s) — research guidance only: never a question, never a page`);
