#!/usr/bin/env node
/**
 * F55 · AI CRAWLER ACCESS AUDIT — may each declared AI crawler reach this client's pages (policy), and did it (retrieval); count-only.
 *
 *   node bin/ai-crawler-access.mjs --tenant=<id> --actor=<id>      READ-ONLY; nothing fetched; writes nothing
 *
 * 🔴 POLICY IS NOT RETRIEVAL. Robots policy answers "may it"; only a recorded retrieval answers "did it" — none is recorded, so every
 * retrieval is NOT_MEASURED. Audit: src/audit/ai-crawler-access.mjs.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { readClientAiCrawlerAccess } from "../src/audit/ai-crawler-access-reader.mjs";

const SCOPE = scopedEntryPoint({ entry: "bin/ai-crawler-access.mjs", governed: false, resources: [RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID), RESOURCES.evidenceStore()] });

const r = readClientAiCrawlerAccess({ tenantId: SCOPE.tenantId, resolve: createTenantResolver() });
const fmt = (o) => Object.entries(o ?? {}).map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
console.log("F55 · AI CRAWLER ACCESS AUDIT — this tenant only, recorded data only, count-only");
console.log(`  bound            ${r.bound}`);
if (!r.summary) { console.log(`  verdict          ${r.audit.verdict} — ${r.audit.why}`); process.exit(0); }
console.log(`  policy           ${fmt(r.summary.policy)} over ${r.summary.pairs} crawler-page pair(s) · deciding group ${fmt(r.summary.policyGroup)}`);
console.log(`  retrieval        ${fmt(r.summary.retrieval)} — policy is never reported as retrieval`);
console.log(`  page directives  addressed ${r.summary.directivesAddressed} · noindex/none ${r.summary.directivesNoindex} (reported beside the policy, never merged into it)`);
