#!/usr/bin/env node
/**
 * F75 · TASK TICKETS — this client's actionable findings drafted into developer or content tickets; count-only.
 *
 *   node bin/task-tickets.mjs --tenant=<id> --actor=<id>      READ-ONLY; nothing fetched, re-run, written, filed or sent
 *
 * 🔴 A ticket's acceptance check is its raising check's own declared boundary; satisfaction is never claimed. Drafts: src/report/tickets.mjs.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { readClientTickets } from "../src/report/tickets-reader.mjs";

const SCOPE = scopedEntryPoint({ entry: "bin/task-tickets.mjs", governed: false, resources: [RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID), RESOURCES.runArtefacts("audit finding stores")] });

const r = readClientTickets({ tenantId: SCOPE.tenantId, resolve: createTenantResolver() });
const fmt = (o) => Object.entries(o ?? {}).map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
console.log("F75 · TASK TICKETS — this client only, recorded data only, drafts only, count-only");
console.log(`  bound            ${r.bound}`);
if (r.verdict === "COULD-NOT-PROVE") { console.log(`  verdict          COULD-NOT-PROVE — ${r.why}`); process.exit(0); }
console.log(`  tickets          ${r.tickets.length} · by kind ${fmt(r.byKind)} · incomplete ${r.incomplete}`);
for (const t of r.tickets) console.log(`    ${(t.kind ?? "NOT MEASURED").padEnd(12)} ${t.check} · findings ${t.findings.length} · affected pages ${t.affectedPages} · evidence ids ${t.evidence.length}${t.withoutEvidence.length ? ` · WITHOUT EVIDENCE ${t.withoutEvidence.length}` : ""} · acceptance ${t.acceptance ? `${t.acceptance.fires.length} declared condition(s)` : "NOT MEASURED"}`);
console.log(`  not this client  ${r.notThisClient} actionable finding(s) — another client's or unattributed; never ticketed here`);
console.log("  note             drafts are returned, never written, filed or sent; satisfaction is never claimed — nothing is re-run");
