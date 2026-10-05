#!/usr/bin/env node
/**
 * F16 · C27–C32 · THE RESEARCH-DERIVED INTAKE ENTRY POINT (Acceptance Amendment 5, _handoffs 91ef421; RTP-1 Revision 6 §22, issued RR-170).
 *
 *   node bin/research-derived-intake.mjs --tenant=<id> --actor=<id> --subject=<id> --research-batch=<id> --confirm
 *
 * 🔴 THERE IS NO DRY RUN, AND IT FETCHES NOTHING. It reads, from the subject's own declared research batch only:
 *   route2-results.json        the client's own research (ROUTE 2), returned against the research questions Visibility FORMED from the
 *                              subject's declaration (C20) — each { formedQueryId, wording, reference? , source? }. Data of the batch.
 *   relevance-assessment-drafts.json   assessments by a METHOD or an AGENT — each { questionId, verdict, reason, meaningTest,
 *                              declarationVersion, source: { kind, ref } }. Data of the batch. An approval field is refused.
 * and the records already written (research-derived-questions.jsonl, relevance-assessments.jsonl). Each route-2 row is classified
 * (src/research/research-derived.mjs): tied to a formed question → RESEARCH-DERIVED (no link, quote, date or proof asked); an owned search
 * query → OWNED SEARCH EVIDENCE, never a question; any other statement → a CLIENT CLAIM. An optional reference is kept, never fetched.
 * Then F16's own count-only report — its attribution line is the production consumer of the attribution check. No wording is printed.
 * Generic: it names no product, tenant, host or source.
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
import { RECORD_TYPE } from "../src/research/public-questions.mjs";
import { formResearchQueries } from "../src/research/ai-connection.mjs";
import { RESEARCH_DERIVED_RECORD, ASSESSMENT_RECORD, ROUTES, SUBMISSION, classifySubmission, researchDerivedQuestion, clientClaimRecord, assessmentRecord,
  researchDerivedStoreRefusals, researchDerivedReport } from "../src/research/research-derived.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch");
if (!SUBJECT || !BATCH) { console.error("usage: node bin/research-derived-intake.mjs --subject=<id> --research-batch=<id> --confirm — nothing read"); process.exit(2); }
const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
if (!permission.mayWrite) { console.error("🔴 REFUSED — INTAKE_REQUIRES_CONFIRM: there is no dry run; nothing read"); process.exit(2); }

const SCOPE = scopedEntryPoint({ entry: "bin/research-derived-intake.mjs", governed: true, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH)] });
const index = rootIndexFor(process.env);
const store = lookupStore(index, "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}`); process.exit(3); }
const subject = lookupSubject(index, SUBJECT);
const members = subject.entry?.members ?? [];
if (!members.some((m) => m.resourceKind === "RESEARCH_BATCH" && m.resourceRef === BATCH)) { console.error("🔴 REFUSED — BATCH_NOT_THIS_SUBJECTS: the subject does not declare this research batch"); process.exit(3); }
/* every read below is of THIS batch, inside the RESEARCH store the gate decided, and of this subject's own declaration */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
const rows = (f) => (existsSync(join(batchDir, f)) ? createJsonlStore(join(batchDir, f)).readAll() : []);
const json = (f) => { if (!existsSync(join(batchDir, f))) return []; try { const v = JSON.parse(readFileSync(join(batchDir, f), "utf8")); return Array.isArray(v) ? v : null; } catch { return null; } };
const descriptorPath = subject.state === "DECLARED" ? join(subject.dir, "descriptor.json") : null;
let descriptor = null;
try { descriptor = descriptorPath && existsSync(descriptorPath) ? JSON.parse(readFileSync(descriptorPath, "utf8")) : null; } catch { descriptor = null; }
const formedIds = new Set(formResearchQueries(descriptor).queries.map((q) => q.queryId));
const submissions = json("route2-results.json"), drafts = json("relevance-assessment-drafts.json");
if (submissions === null || drafts === null) { console.error("🔴 REFUSED — INTAKE_FILE_UNREADABLE: route2-results.json or relevance-assessment-drafts.json is not a readable list; nothing written"); process.exit(3); }

const instant = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const known = rows("research-derived-questions.jsonl").filter((r) => r.record_type === RESEARCH_DERIVED_RECORD);
const recordedAssessments = rows("relevance-assessments.jsonl").filter((r) => r.record_type === ASSESSMENT_RECORD);
const fresh = [], claims = [], refused = {};
let owned = 0;
for (const row of submissions) {
  const c = classifySubmission(row, { formedIds });
  if (c.kind === SUBMISSION.OWNED_SEARCH_EVIDENCE) { owned += 1; continue; }
  if (c.kind === SUBMISSION.REFUSED) { refused[c.code] = (refused[c.code] ?? 0) + 1; continue; }
  if (c.kind === SUBMISSION.CLIENT_CLAIM) { claims.push(clientClaimRecord({ subject: SUBJECT, wording: row.wording, at: instant })); continue; }
  fresh.push(researchDerivedQuestion({ subject: SUBJECT, queryId: row.formedQueryId, route: ROUTES.CLIENT_RESEARCH, wording: row.wording, reference: row.reference ?? null, at: instant }));
}
const kindRefusals = researchDerivedStoreRefusals(fresh);
if (kindRefusals.length) { console.error(`🔴 REFUSED — ${kindRefusals[0]}; nothing written`); process.exit(3); }
const all = [...new Map([...known, ...fresh].map((q) => [q.question_id, q])).values()];
const assessments = [];
for (const d of drafts) {
  const r = assessmentRecord({ question: all.find((q) => q.question_id === d?.questionId) ?? null, draft: d, at: instant });
  if (r.outcome === "REFUSED") { refused[r.code] = (refused[r.code] ?? 0) + 1; continue; }
  assessments.push(r.record);
}

const append = (recs, file, action) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope,
  repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(join(batchDir, file)), records: recs,
  targetClass: "GENERATED_CONFIG", action, occurredAt: instant, correlationId: `run:research-derived-intake:${instant}`, discipline: "APPEND_IF_NEW",
}));
const persisted = (g) => g.outcome === "COMMITTED" || g.outcome === "ALREADY_COMMITTED";
const writeOrExit = (recs, file, action, what) => { if (!recs.length) return; const g = append(recs, file, action); if (!persisted(g)) { console.error(`  🔴 ${g.outcome} — ${recs.length} ${what} did NOT persist`); process.exit(1); } };
writeOrExit(fresh, "research-derived-questions.jsonl", "APPEND_RESEARCH_DERIVED_QUESTIONS", "research-derived question(s)");
writeOrExit(claims, "questions.jsonl", "APPEND_CLIENT_CLAIMS", "client claim(s)");
writeOrExit(assessments, "relevance-assessments.jsonl", "APPEND_RELEVANCE_ASSESSMENTS", "relevance assessment(s)");

console.log("F16 · RESEARCH-DERIVED QUESTIONS — this tenant's subject only, count-only; nothing fetched, no wording printed");
console.log(`  SAMPLE — what research returned for the questions Visibility formed; never every question in the world`);
console.log(`  route-2 rows ${submissions.length}: research-derived ${fresh.length} · client claims ${claims.length} · owned search evidence kept apart ${owned} · refused ${Object.values(refused).reduce((a, n) => a + n, 0)}${Object.keys(refused).length ? ` (${Object.entries(refused).map(([k, n]) => `${k} ${n}`).join(" · ")})` : ""}`);
console.log(`  assessments recorded now ${assessments.length}`);
const allClaims = [...rows("questions.jsonl"), ...claims].filter((r) => r.record_type === RECORD_TYPE && r.value?.kind === "CLIENT_CLAIM").length;
for (const l of researchDerivedReport({ questions: all, assessments: [...recordedAssessments, ...assessments], claims: allClaims, owned, at: instant })) console.log(`  ${l}`);
