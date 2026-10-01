#!/usr/bin/env node
/**
 * F16 · THE GOVERNED HUMAN-OBSERVATION PATH — record what a PERSON saw being asked, for one client's subject, into that client's own
 * declared research batch; count-only (RR-116; acceptance _handoffs 944f769; reconciliation 9d37eab).
 *
 *   node bin/observe-question.mjs --tenant=<id> --actor=<id> --subject=<id> --research-batch=<id> --submission=<file.json> [--confirm]
 *
 * 🔴 THE ENGINE DOES NOT SEARCH, FETCH OR OPEN ANY REFERENCE. Every resource is decided by the scope gate for THIS tenant first: the
 * subject, the research batch (declared in the RESEARCH store and attached to the tenant) and the submission file. Each submission is
 * validated (src/research/human-observation.mjs); a refused one is never stored. The accepted ones are written through the governed
 * boundary, and every record is placed in its evidence state before the write is accepted. Without --confirm nothing is written.
 * Nothing here names a product.
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
import { validateSubmission, BATCH_PURPOSES } from "../src/research/human-observation.mjs";
import { PILOT_MARK } from "../src/research/public-questions.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch"), FILE = arg("submission");
if (!SUBJECT || !BATCH || !FILE) {
  console.error("usage: node bin/observe-question.mjs --subject=<id> --research-batch=<id> --submission=<file.json> [--confirm] — nothing read, nothing written");
  process.exit(2);
}
const SCOPE = scopedEntryPoint({ entry: "bin/observe-question.mjs", governed: true, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH), RESOURCES.inputPath(FILE, "--submission")] });

const index = rootIndexFor(process.env);
const store = lookupStore(index, "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}`); process.exit(3); }
const batchDir = join(store.dir, BATCH);
if (!existsSync(batchDir)) { console.error("🔴 REFUSED — RESEARCH_BATCH_ABSENT: the declared research batch has no directory in the RESEARCH store"); process.exit(3); }
/* the client's own declared site origin: the identity by which F16 later reads these records as THIS client's, and no other's */
const site = (lookupSubject(index, SUBJECT).entry?.connectors ?? []).find((c) => c.kind === "PUBLIC_SITE");
const origin = site?.reaches?.find((x) => x.resourceKind === "SITE_ORIGIN")?.resourceRef ?? null;

/* RR-117 §5: a batch may declare its purpose in its own manifest; a TEST_PILOT batch stamps every record it receives, in the data */
const manifestPath = join(batchDir, "batch.json");
const declaredPurpose = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8"))?.purpose ?? null : null;
if (declaredPurpose !== null && !BATCH_PURPOSES.includes(declaredPurpose)) { console.error("🔴 REFUSED — BATCH_PURPOSE_UNDECLARED: the batch manifest names a purpose no rule declares; nothing written"); process.exit(3); }

const submissions = JSON.parse(readFileSync(FILE, "utf8"));
if (!Array.isArray(submissions)) { console.error("🔴 REFUSED — the submission file is not a list of submissions; nothing written"); process.exit(2); }
const results = submissions.map((s) => validateSubmission(s, { origin, dataPurpose: declaredPurpose }));
const foreign = submissions.filter((s) => s?.subject !== SUBJECT).length;
const accepted = results.filter((r, i) => r.accepted && submissions[i].subject === SUBJECT).map((r) => r.record);
const refusedBy = {};
results.forEach((r, i) => { const why = submissions[i]?.subject !== SUBJECT ? ["SUBJECT_IS_NOT_THIS_RUNS_SUBJECT"] : r.accepted ? [] : r.refusals; for (const w of why) refusedBy[w] = (refusedBy[w] ?? 0) + 1; });
const byKind = accepted.reduce((m, r) => ((m[r.value.kind] = (m[r.value.kind] ?? 0) + 1), m), {});

const lines = [
  `SAMPLE — not a census of the world's questions · declared limits: the ${submissions.length} submission(s) of this session, each stored with its own declared limits`,
  `submissions ${submissions.length} · accepted ${accepted.length} of ${submissions.length} · refused ${submissions.length - accepted.length} of ${submissions.length} (another subject's: ${foreign})`,
  `accepted by kind: OBSERVED ${byKind.OBSERVED ?? 0} · INFERRED ${byKind.INFERRED ?? 0} · CLIENT_CLAIM ${byKind.CLIENT_CLAIM ?? 0} — three separate kinds, never merged`,
  `refusals by rule: ${Object.entries(refusedBy).map(([k, n]) => `${k} ${n}`).join(" · ") || "none"}`,
  "provenance: a person saw each observation; the engine searched nothing, fetched nothing and opened no reference",
  ...(declaredPurpose === "TEST_PILOT" ? [`${PILOT_MARK} — this batch is declared TEST_PILOT: not the demand of any country, not global demand, not a production client result`] : []),
];
console.log("F16 · HUMAN OBSERVATIONS — this tenant's subject only, count-only");
for (const l of lines) console.log(`  ${l}`);

const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
if (!permission.mayWrite) { console.log("  NOT WRITTEN — no --confirm: 0 records kept"); process.exit(0); }
if (accepted.length === 0) { console.log("  KEPT 0 — nothing accepted, nothing written"); process.exit(0); }
const instant = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
let governed;
try {
  governed = executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope,
    repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(join(batchDir, "questions.jsonl")), records: accepted,
    targetClass: "GENERATED_CONFIG", action: "APPEND_HUMAN_OBSERVATIONS", occurredAt: instant, correlationId: `run:observe-question:${instant}`,
    discipline: "APPEND_IF_NEW",
  }));
} catch (e) {
  console.error(`  🔴 REFUSED (${e.code ?? e.name}) — ${accepted.length} accepted record(s) did NOT persist; nothing is kept`);
  process.exit(1);
}
if (governed.outcome !== "COMMITTED" && governed.outcome !== "ALREADY_COMMITTED") {
  console.error(`  🔴 ${governed.outcome} — ${accepted.length} accepted record(s) did NOT persist; nothing is kept`);
  process.exit(1);
}
console.log(`  KEPT ${accepted.length} of ${submissions.length} — written through the governed boundary (${governed.outcome})`);
