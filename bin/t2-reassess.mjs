#!/usr/bin/env node
/**
 * 🔴 RR-194 · T-2 · RE-ASSESS THE VERSION-1 CONTENT-SUPPLY FINDINGS OF ONE TENANT (RTP-1 §17 S10, P20, P21, P24; the owner's PG-A1;
 * RR-193's plan, _handoffs cd973c6). The rules live in src/audit/t2-reassessment.mjs (pure, test-driven); this entry point decides the
 * tenant scope, reads only that tenant's partition, and appends — append-only, nothing edited or deleted.
 *
 *   node bin/t2-reassess.mjs --tenant=<id> --actor=actor:cc              dry run: prints what it would append, appends nothing to a store
 *   node bin/t2-reassess.mjs --tenant=<id> --actor=actor:cc --confirm    appends, in BOTH findings stores, for that tenant's findings only
 *
 * 🔴 ONE TENANT PER RUN. The two findings stores are SHARED (RR-193: 125 findings on pages of 15 tenants), so they are named only as that
 * tenant's PARTITION — never attached whole (F02 ruling). No --tenant: refused at the gate, before anything is read.
 * 🔴 REFUSES THE WHOLE RUN, nothing written, when a selected finding's page resolves to another tenant, when the copies of one finding read
 * differently in the two stores, or when a finding's recorded value cannot be read back (src/audit/t2-reassessment.mjs REFUSAL).
 * Re-running appends nothing for a finding that has already moved.
 * Testability seam (gap 2's): --content-store= and --labels-store= choose WHERE, confined to this repository; never WHETHER.
 */
import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend, governedAuditContext } from "../src/governance/governed-run.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { lifecycleOf } from "../src/evidence/lifecycle.mjs";
import { softwareVersionOf } from "../src/audit-trail/wiring.mjs";
import { checkTransition, recordEvidenceStateTransitions } from "../src/evidence/evidence-state.mjs";
import { evidenceStateOf, evidenceStateAuthority } from "../src/evidence/evidence-state-adapters.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { readTenantPartition } from "../src/crawl/batch-partition.mjs";
import { planReassessment, RE_ASSESSMENT_AUTHORITY } from "../src/audit/t2-reassessment.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
export const CONTENT_STORE = "runs/audit/content-findings.jsonl";
export const LABELS_STORE = "runs/audit/supply-labels.jsonl";
const CONTENT = confineToRepo(arg("content-store") ?? `${REPO}${CONTENT_STORE}`, { label: arg("content-store") === undefined ? "the content findings store" : "--content-store" });
const LABELS = confineToRepo(arg("labels-store") ?? `${REPO}${LABELS_STORE}`, { label: arg("labels-store") === undefined ? "the supply labels store" : "--labels-store" });
const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read: the crawl batch and BOTH
 * findings stores, each as the requested tenant's PARTITION. */
const SCOPE = scopedEntryPoint({ entry: "bin/t2-reassess.mjs", governed: true, resources: [
  RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID),
  RESOURCES.collectionPartition("RUN_STORE", CONTENT_STORE),
  RESOURCES.collectionPartition("RUN_STORE", LABELS_STORE),
] });

const resolve = createTenantResolver();
const partition = readTenantPartition({ batchId: BATCH_ID, tenantId: SCOPE.tenantId, resolve });
const pagesOfTenant = new Map(partition.records.filter((r) => r.record_type === "page" && r.page_id && r.canonical_url).map((r) => [r.page_id, r.canonical_url]));
const tenantOfUrl = (url) => { try { const s = resolveSide(resolve, { resourceKind: "SITE_ORIGIN", resourceRef: new URL(url).origin, scopeClass: "TENANT" }); return s.state === "RESOLVED" ? s.tenantId : null; } catch { return null; } };

const stores = [{ name: CONTENT_STORE, path: CONTENT }, { name: LABELS_STORE, path: LABELS }].map((s) => ({ ...s, store: createJsonlStore(s.path), records: createJsonlStore(s.path).readAll() }));
const now = new Date().toISOString();
const plan = planReassessment({ stores, tenantId: SCOPE.tenantId, pagesOfTenant, tenantOfUrl, now, actor: "actor:cc", action: "bin/t2-reassess.mjs — replacement issued by the version-2 check (RR-194 T-2)" });

console.log("RR-194 · T-2 — RE-ASSESS THE VERSION-1 CONTENT-SUPPLY FINDINGS (one tenant)");
console.log(`[bound: tenant ${SCOPE.tenantId} · its partition of ${BATCH_ID}: ${pagesOfTenant.size} page(s) · stores ${CONTENT_STORE}, ${LABELS_STORE} · nothing fetched]`);
if (plan.refused.length) {
  for (const r of plan.refused) console.error(`🔴 REFUSED ${r.code} — finding ${r.id}${r.owner ? ` resolves to ${r.owner}` : ""}${r.stores ? ` (${r.stores.join(", ")})` : ""}`);
  console.error(`🔴 REFUSED — ${plan.refused.length} finding(s); nothing was written`);
  process.exit(2);
}
console.log(`  selected (OPEN version-1 FAILs on this tenant's pages): ${plan.selected} · ${JSON.stringify(plan.byDetector)} · other tenants' findings left alone: ${plan.skipped}`);
for (const w of plan.writes) console.log(`  ${w.store}: ${w.replacements.length} replacement(s) + ${w.changes.length} state change(s)`);
const total = plan.writes.reduce((n, w) => n + w.replacements.length + w.changes.length, 0);
if (total === 0) { console.log("nothing to re-assess — every selected finding has already moved; nothing appended"); process.exit(0); }

const RUN_INSTANT = isoSeconds(Date.now());
const CORRELATION = `run:t2-reassess:${SCOPE.tenantId}:${RUN_INSTANT}`;
const outcomes = [];
for (const w of plan.writes) {
  const s = stores.find((x) => x.name === w.store);
  outcomes.push(executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: REPO, permission, store: s.store, records: w.replacements, targetClass: "RUN_EVIDENCE",
    action: "APPEND_T2_REASSESSMENT_ISSUES", occurredAt: RUN_INSTANT, correlationId: CORRELATION, discipline: "APPEND_IF_NEW", seenAt: now })));
  outcomes.push(executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: REPO, permission, store: s.store, records: w.changes, targetClass: "RUN_EVIDENCE",
    action: "APPEND_T2_REASSESSMENT_STATE_CHANGES", occurredAt: RUN_INSTANT, correlationId: CORRELATION, discipline: "APPEND_ALL_WITHOUT_DEDUPE" })));
}
const bad = outcomes.find((o) => !["REFUSED", "COMMITTED", "ALREADY_COMMITTED"].includes(o.outcome));
if (bad) { console.error(`🔴 ${bad.outcome} — the re-assessment was not fully written; the governed attempt is on the audit trail`); process.exit(1); }
if (outcomes.every((o) => o.outcome === "REFUSED")) {
  console.log(`\n[dry-run] would have appended ${total} records — add --confirm`);
  process.exit(0);
}
/* F06 — each supersession changes what an item may be reported as: INFERRED (a version-1 finding) → UNKNOWN (a review signal). One event
 * per finding, recorded once its replacement is committed; a replay records nothing new. */
const TRANSITION_AT = isoSeconds(Date.now());
const TRANSITION_CORRELATION = `run:t2-reassess:transitions:${SCOPE.tenantId}:${TRANSITION_AT}`;
const ctx = { actor: "bin/t2-reassess.mjs", at: TRANSITION_AT, rule: "T2_REASSESS_ON_THE_VERSION_2_CHECK", softwareVersion: softwareVersionOf(REPO), correlationId: TRANSITION_CORRELATION, ...evidenceStateAuthority({ now: TRANSITION_AT.slice(0, 10) }) };
const drafts = plan.pairs.map(({ old, replacement }) => checkTransition({ from: evidenceStateOf(old), to: evidenceStateOf(replacement), fromRef: `issue:${old.issue_id}`, toRef: `issue:${replacement.issue_id}`, newEvidenceRefs: [...RE_ASSESSMENT_AUTHORITY] }, ctx));
const transitionAudit = governedAuditContext({ repo: REPO, correlationId: TRANSITION_CORRELATION });
const recorded = recordEvidenceStateTransitions({ audit: transitionAudit, drafts });
console.log(`[F08] evidence-state transitions recorded: ${recorded.filter((r) => r.status === "APPENDED").length} of ${drafts.length}`);
for (const s of stores) {
  const after = lifecycleOf(createJsonlStore(s.path).readAll());
  if (after.errors.length) { for (const e of after.errors) console.error(`  🔴 ${s.name}: ${e}`); process.exit(1); }
}
console.log(`\nappended ${total} records across ${plan.writes.length} store(s) for ${plan.selected} finding(s); lifecycle errors: 0`);
