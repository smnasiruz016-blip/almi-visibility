#!/usr/bin/env node
/**
 * F23 · INTERNAL AND EXTERNAL LINK AUDIT — one client's recorded links, count-only.
 *
 *   node bin/link-audit.mjs --tenant=<id> --actor=<id>      READ-ONLY; nothing fetched, rendered or followed; writes nothing
 *
 * 🔴 AN EXTERNAL DESTINATION NEVER FETCHED IS NOT MEASURED (RR-111) — never working, never broken, never 0. Excessive and weakly
 * contextual follow the owner's declared rule (RR-127 §2: no maximum link count; purpose, context, destination): purpose and context
 * are per-link judgements no record holds, so both stay NOT MEASURED, naming that record. Audit: src/audit/link-audit.mjs.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { readClientLinkAudit } from "../src/audit/link-audit-reader.mjs";
import { formatPart } from "../src/audit/link-audit.mjs";

const SCOPE = scopedEntryPoint({ entry: "bin/link-audit.mjs", governed: false, resources: [RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID)] });

const r = readClientLinkAudit({ tenantId: SCOPE.tenantId, resolve: createTenantResolver() });
const a = r.audit, p = a.parts;
console.log("F23 · LINK AUDIT — this tenant only, stored raw-HTML bodies only, count-only");
console.log(`  bound        ${r.bound}`);
console.log(`  ${formatPart("INTERNAL", p.internal)}`);
console.log(`  ${formatPart("EXTERNAL", p.external)}`);
const n = p.anchorName.counts;
console.log(`  ANCHOR NAME: ${a.links} link(s) · ANCHOR PROBLEM (no accessible name, WCAG 2.2 SC 4.1.2) ${n.nameless} · named ${n.named} (adequacy NEEDS A PERSON, never judged) · NOT MEASURED ${n.notMeasured} of ${a.links} — ${p.anchorName.verdict}`);
console.log(`  ORPHANED: no inbound link in raw HTML ${p.orphaned.unknown} of ${p.orphaned.denominator} page(s) — UNKNOWN, never orphan — ${p.orphaned.verdict}`);
for (const k of ["hidden", "excessive", "weaklyContextual"]) console.log(`  ${k.toUpperCase()}: NOT MEASURED ${p[k].notMeasured} of ${p[k].denominator} — missing ${p[k].missing} — ${p[k].verdict}`);
console.log(`  population   ${a.incomplete ? "INCOMPLETE" : "COMPLETE"}${a.incomplete ? ` — absent: ${a.absent.join(" · ")}` : ""}`);
console.log(`  verdict      ${a.verdict}`);
