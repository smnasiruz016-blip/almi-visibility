#!/usr/bin/env node
/**
 * F79 · EVIDENCE CACHE BEFORE RE-RESEARCH — what the held evidence would have served of the recorded repeat requests; count-only.
 *
 *   node bin/evidence-cache.mjs --tenant=<id> --actor=<id>      READ-ONLY; this tenant's answers only; writes nothing
 *
 * 🔴 F02 tenant-isolation conformance: the tenant is decided HERE, and a record is served only inside its partition. A MISS is reported
 * as re-research required and is NEVER run — no collection, no metered or paid call. Cache: src/evidence/evidence-cache.mjs.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { readRecordedReuse } from "../src/evidence/evidence-cache-real.mjs";

const SCOPE = scopedEntryPoint({ entry: "bin/evidence-cache.mjs", governed: false, resources: [RESOURCES.evidenceStore()] });

const r = readRecordedReuse({ tenantId: SCOPE.tenantId, resolve: createTenantResolver() });
const s = r.summary;
console.log("F79 · EVIDENCE CACHE BEFORE RE-RESEARCH — this tenant only, recorded data only, count-only");
console.log(`  bound            ${r.bound}`);
console.log(`  served           ${s.served} of ${s.repeats} recorded repeat(s) · metered requests those repeats cost ${s.meteredRequestsServed} (request count not recorded on ${s.servedWithRequestCountNotRecorded})`);
console.log(`  misses           ${Object.entries(s.misses).map(([k, n]) => `${k} ${n}`).join(" · ") || "none"} — each is re-research REQUIRED, and none was run`);
