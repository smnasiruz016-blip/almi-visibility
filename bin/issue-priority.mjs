#!/usr/bin/env node
/**
 * F29 · TECHNICAL ISSUE PRIORITIZATION — this client's recorded open issues, ranked by dominance only; count-only.
 *
 *   node bin/issue-priority.mjs --tenant=<id> --actor=<id>      READ-ONLY; nothing fetched or changed
 *
 * No weight is invented: an issue ranks above another only when it is at least as high on every recorded dimension and higher on one.
 * A rank is not a fix and not a promise. Ranking: src/audit/issue-priority.mjs.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { readClientIssuePriority } from "../src/audit/issue-priority-reader.mjs";

const SCOPE = scopedEntryPoint({ entry: "bin/issue-priority.mjs", governed: false, resources: [RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID), RESOURCES.evidenceStore(), RESOURCES.runArtefacts("audit findings")] });

const r = readClientIssuePriority({ tenantId: SCOPE.tenantId, resolve: createTenantResolver() });
const k = r.ranking;
const fmt = (o) => Object.entries(o ?? {}).map(([a, n]) => `${a} ${n}`).join(" · ") || "none";
console.log("F29 · TECHNICAL ISSUE PRIORITIZATION — this tenant only, recorded data only, dominance only, count-only");
console.log(`  bound            ${r.bound}`);
console.log(`  issues ranked    ${k.issues} in ${k.layers.length} layer(s): sizes ${k.layerSizes.join(", ") || "none"} — issues sharing a layer are incomparable, never ordered by guess`);
console.log(`  not measured     ${fmt(k.notMeasured)} (issues per dimension; a NOT MEASURED dimension takes no part)`);
console.log("  note             a rank changes nothing and predicts no gain");
