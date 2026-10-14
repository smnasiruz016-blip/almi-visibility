#!/usr/bin/env node
/**
 * F23 · INTERNAL AND EXTERNAL LINK AUDIT — one client's own pages, count-only (F23 Acceptance Amendment 2, _handoffs eeb7245).
 *
 *   node bin/link-audit.mjs --subject=<id> --tenant=<id> --actor=<id>      READ-ONLY; nothing fetched, rendered or followed; writes nothing
 *
 * 🔴 ONLY THE PAGES THE ENGINE BUILT (the owner's principle, 14 October 2026): the pages built for this client and not published, as they
 * stand in every research batch the client declares, and those pages once live. No crawl batch is an input, and no batch or date is a
 * default. Every destination is classed from the stored observations of the bounded link-status check (bin/link-status.mjs); one never
 * observed is NOT MEASURED — never working, never broken, never 0. A page's link count is reported and never judged.
 * Output: counts with their denominators, per page and in all. No address, no link name, no page text. Audit: src/audit/page-links.mjs.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES, declaredSiteHosts } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore, lookupSubject } from "../src/tenancy/root-registry.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { canon } from "../src/audit/link-audit-reader.mjs";
import { auditClientPages } from "../src/audit/built-page-links.mjs";
import { formatPart, formatPage } from "../src/audit/page-links.mjs";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject");
if (!SUBJECT) { console.error("usage: node bin/link-audit.mjs --subject=<id> --tenant=<id> --actor=<id> — nothing read, nothing written"); process.exit(2); }
/* the research batches the client DECLARES — read from its declaration, never from a default */
const index = rootIndexFor(process.env);
const BATCHES = (lookupSubject(index, SUBJECT).entry?.members ?? []).filter((m) => m.resourceKind === "RESEARCH_BATCH").map((m) => m.resourceRef);
const SCOPE = scopedEntryPoint({ entry: "bin/link-audit.mjs", governed: false, resources: [RESOURCES.subject(SUBJECT), ...BATCHES.map((b) => RESOURCES.researchBatch(b))] });

const store = lookupStore(index, "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}`); process.exit(3); }
/* every read below is of one of THIS client's declared batches, inside the RESEARCH store the gate decided */
const rows = (batch, name) => { const file = join(lookupStore(index, "RESEARCH").dir, batch, name); return existsSync(file) ? createJsonlStore(file).readAll() : []; };
const batches = BATCHES.map((batchId) => ({ batchId, builds: rows(batchId, "joined-pages.jsonl"), decisions: rows(batchId, "built-page-needs.jsonl"), reads: rows(batchId, "live-pages.jsonl"), observations: rows(batchId, "link-status.jsonl") }));
const hosts = [...declaredSiteHosts({ tenantId: SCOPE.tenantId })].sort();
const r = auditClientPages({ batches, tenantId: SCOPE.tenantId, hosts, canon });
const a = r.audit, p = a.parts, n = p.anchorName.counts, w = p.weaklyContextual;

console.log("F23 · LINK AUDIT — this client only · only the pages the engine built · stored bodies only · count-only");
console.log(`  population   BUILT, NOT YET PUBLISHED ${r.population.built} page(s) · LIVE ${r.population.live} page(s) (with no stored read ${r.population.liveWithNoStoredRead}) · published on a host this client does not declare ${r.population.publishedElsewhere} (never read) · research batch(es) declared ${BATCHES.length} · declared host(s) ${hosts.length} · no crawl batch is an input`);
console.log(`  bound        stored records only · ${a.pages} page(s), ${a.pagesWithBody} with a stored body · ${a.links} link occurrence(s) · ${r.observedAddresses} address(es) with a stored observation · nothing fetched, rendered or written`);
a.perPage.forEach((page, i) => console.log(`  ${formatPage(page, i + 1, a.perPage.length)}`));
console.log(`  ${formatPart("INTERNAL", p.internal)}`);
console.log(`  ${formatPart("EXTERNAL", p.external)}`);
console.log(`  ANCHOR NAME: ${a.links} link(s) · ANCHOR PROBLEM (no accessible name, WCAG 2.2 SC 4.1.2) ${n.nameless} · named ${n.named} (adequacy NEEDS A PERSON, never judged) · NOT MEASURED ${n.notMeasured} of ${a.links} — ${p.anchorName.verdict}`);
console.log(`  WEAKLY CONTEXTUAL: ${w.weak} of ${w.denominator} link(s) (${Object.entries(w.byLimb).map(([k, c]) => `${k} ${c}`).join(" · ")}) · NOT MEASURED ${w.notMeasured} of ${w.denominator}${w.genericNotMeasured ? ` (${w.genericNotMeasured}: ${w.missing})` : ""} — ${w.verdict}`);
console.log(`  LINK COUNT: ${p.excessive.links} link(s) on ${p.excessive.denominator} page(s) — reported, never a pass or a failure (no count threshold exists)`);
console.log(`  NAMED ONLY BY A WEB ADDRESS: ${p.addressNames.count} of ${p.addressNames.denominator} — counted, never called weak, no verdict`);
console.log(`  ORPHANED: inbound links NOT MEASURED for ${p.orphaned.notMeasured} of ${p.orphaned.denominator} page(s) — missing ${p.orphaned.missing} — ${p.orphaned.verdict}`);
console.log(`  HIDDEN: NOT MEASURED ${p.hidden.notMeasured} of ${p.hidden.denominator} — missing ${p.hidden.missing} — ${p.hidden.verdict}`);
console.log(`  population   ${a.pages === 0 ? "0 page(s) — this client has no built and no live page; nothing to audit, and that is not an error" : a.incomplete ? `INCOMPLETE — absent: ${a.absent.join(" · ")}` : "COMPLETE"}`);
console.log(`  verdict      ${a.pages === 0 ? "none — no page" : a.verdict}`);
