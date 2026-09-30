#!/usr/bin/env node
/**
 * F26 · ACCESSIBILITY ASSESSMENT — machine-checked findings and needs-a-person items, kept apart; count-only.
 *
 *   node bin/accessibility.mjs --tenant=<id> --actor=<id>      READ-ONLY; nothing fetched or rendered; writes nothing
 *
 * 🔴 AN AUTOMATED SCAN NEVER PROVES ACCESSIBILITY (RR-95). A page is DISPROVED when a machine check finds a failure and COULD-NOT-PROVE
 * otherwise. Stored bodies are not rendered pages. Assessment: src/audit/accessibility.mjs.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { readClientAccessibility } from "../src/audit/accessibility-reader.mjs";

const SCOPE = scopedEntryPoint({ entry: "bin/accessibility.mjs", governed: false, resources: [RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID)] });

const r = readClientAccessibility({ tenantId: SCOPE.tenantId, resolve: createTenantResolver() });
const a = r.assessment;
const fmt = (o) => Object.entries(o ?? {}).map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
console.log("F26 · ACCESSIBILITY ASSESSMENT — this tenant only, stored bodies only, count-only");
console.log(`  bound            ${r.bound}`);
console.log(`  MACHINE-CHECKED  ${a.machineChecked.checks} checks over ${a.machineChecked.pagesChecked} page(s): ${fmt(a.machineChecked.instances)} · pages with a failure ${a.machineChecked.pagesWithAFailure}`);
console.log(`  NEEDS A PERSON   ${fmt(a.needsAPerson.items)} — located, never judged, never added to the machine count`);
console.log(`  NOT MEASURED     ${a.notMeasured.criteria.length} criteria need a rendered or operated page · pages without a usable body ${a.notMeasured.pagesWithoutABody}`);
console.log(`  verdicts         ${fmt(a.verdicts)} — an automated scan never proves accessibility; no page reads PROVED`);
