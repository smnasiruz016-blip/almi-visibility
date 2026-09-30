#!/usr/bin/env node
/**
 * F20 · STATUS, REDIRECT AND URL AUDIT — one client's recorded URLs; observed and linked-only kept apart; count-only.
 *
 *   node bin/url-audit.mjs --tenant=<id> --actor=<id>      READ-ONLY; nothing fetched; writes nothing
 *
 * A linked-only URL was never fetched: its status is NOT MEASURED, never assumed. Audit: src/audit/url-audit.mjs.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { readClientUrlAudit } from "../src/audit/url-audit-reader.mjs";

const SCOPE = scopedEntryPoint({ entry: "bin/url-audit.mjs", governed: false, resources: [RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID)] });

const r = readClientUrlAudit({ tenantId: SCOPE.tenantId, resolve: createTenantResolver() });
const a = r.audit;
const fmt = (o) => Object.entries(o ?? {}).map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
console.log("F20 · STATUS, REDIRECT AND URL AUDIT — this tenant only, recorded data only, count-only");
console.log(`  bound            ${r.bound}`);
console.log(`  observed         ${a.observed.urls}: status ${fmt(a.observed.status)} · redirects ${fmt(a.observed.redirects)} · hops ${a.observed.hops}`);
console.log(`  linked-only      ${a.linkedOnly.urls}: status and redirects NOT MEASURED — missing ${a.linkedOnly.missing}`);
console.log(`  link targets     well-formed ${a.linkTargets.WELL_FORMED} · malformed ${a.linkTargets.MALFORMED} · non-web ${a.linkTargets.NON_WEB}`);
console.log(`  preferred        linked in more than one form ${a.preferredLocation.linkedInMoreThanOneForm} · canonical names another form ${a.preferredLocation.canonicalInconsistent} · no canonical ${a.preferredLocation.canonicalMissing} · canonical names another page ${a.preferredLocation.canonicalElsewhere}`);
console.log(`  verdict          ${a.verdict} (findings ${a.findings})`);
