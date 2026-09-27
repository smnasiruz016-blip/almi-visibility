#!/usr/bin/env node
/**
 * 🔴 F10 · C3 · THE ONE GOVERNED N=100 SELECTION — sealed into storage S (command ec3bbaf §4; F10 Amendment 1, 2ee6c2a).
 *
 *   node bin/f10-select.mjs status                          read-only: the four versions and the store — codes and counts only
 *   node bin/f10-select.mjs seal --actor=<ref> [--confirm]  the ONE selection. Without --confirm nothing is written.
 *
 * `seal` plans read-only, then commits ONLY through the governed-write boundary (executeGovernedWrite): the actor authorised by F04, a
 * refused plan or an already-sealed store refused at prevalidation, ATTEMPTED, the packet into S plus ONE count-only seal record
 * (evaluation-releases/selection-seals.jsonl), verified, COMMITTED.
 * 🔴 SEALING IS A ONE-WAY DOOR: it runs once, it is never re-drawn, and on the frozen allocation it consumes SIX of the nine
 * tenants to their full eligible capacity — after it they hold ZERO unsealed eligible rows, permanently. The owner accepted this
 * knowingly; the act records it.
 *
 * Prints counts, the two commitments and codes. Never an identity, a wording, a label or the store's location.
 */
import { join } from "node:path";
import { SEALED_STORE_ROOTS, EVIDENCE_ROLE_REGISTRY } from "../config/evidence-roles.mjs";
import { COMMITTED_ACCOUNTING } from "../config/human-questions.mjs";
import { C7_BAR } from "../config/follow-up-questions.mjs";
import { resolveSealedStoreRoots } from "../src/governance/sealed-store-roots.mjs";
import { governedAuditContext } from "../src/governance/governed-run.mjs";
import { guardAuthority } from "../src/governance/guard-audit.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { writePermission, announceWritePermission, LOCAL, PRODUCTION } from "../src/write-law.mjs";
import { writeGateEvent } from "../src/audit-trail/recorder.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { recordGateDecisions } from "../src/heldout/lifecycle.mjs";
import { namedActor, AUTHORISATION_REFUSED_EXIT } from "../src/governance/authorisation.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { pinnedObservationRows, decidePartition, readTenantPartition } from "../src/discovery/search-console-partition.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { accountPopulation, retiredMembers } from "../src/discovery/human-question-population.mjs";
import { planSelection, governedSealing, SelectionRefused, OWNER_README } from "../src/discovery/f10-selection.mjs";
import { versionStates } from "../src/discovery/f10-versions.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const argv = process.argv.slice(2);
const cmd = argv[0];
if (!["status", "seal"].includes(cmd)) { console.error("usage: node bin/f10-select.mjs status | seal --actor=<ref> [--confirm]"); process.exit(2); }

const NOW = isoSeconds(Date.now());
const correlationId = `run:f10-select:${cmd}:${NOW}`;
const { authorityRef, authorityHash } = guardAuthority({ now: NOW.slice(0, 10) });
const ctx = { ...governedAuditContext({ repo: REPO, correlationId, authorityRef, authorityHash }), actor: "bin/f10-select.mjs" };
const stores = resolveSealedStoreRoots({ declared: SEALED_STORE_ROOTS });
const S = stores.roots["f10-marking-key"];
const states = versionStates(REPO, ctx.store.readAll().events);

console.log("F10 · THE ONE GOVERNED SELECTION");
for (const s of states) console.log(`  version ${s.role.padEnd(13)} ${s.id.padEnd(28)} code ${s.codeHash.slice(0, 12)}… · ${s.state}${s.frozenAt ? ` (${s.frozenAt})` : ""}`);
console.log(`  storage S · ${S ? "LOCATED" : `NOT LOCATED (${stores.codes["f10-marking-key"]})`}`);
if (cmd === "status") process.exit(0);

/* ── THE WRITE-GATE DECISION, RECORDED BEFORE ANYTHING ELSE ── */
const permission = announceWritePermission(writePermission({ target: LOCAL, argv, env: process.env }));
if (!permission.mayWrite) { console.log("[dry-run] nothing is selected and nothing is written — the one selection needs --confirm"); process.exit(0); }
recordGateDecisions({ audit: ctx, drafts: [
  writeGateEvent({ permission, target: "local", action: "RECORD_F10_SELECTION", actor: ctx.actor, softwareVersion: ctx.softwareVersion, correlationId, occurredAt: NOW, authorityRef, authorityHash }),
  writeGateEvent({ permission: writePermission({ target: PRODUCTION, argv, env: process.env }), target: "production", action: "WRITE_BEYOND_THIS_MACHINE", actor: ctx.actor, softwareVersion: ctx.softwareVersion, correlationId, occurredAt: NOW, authorityRef, authorityHash }),
] });

/* ── THE PLAN (read-only), then THE ONE SEAL THROUGH THE GOVERNED-WRITE BOUNDARY ──
 * A refused plan is handed to the boundary as a prevalidation fault, so a refusal is authorised, recorded and writes nothing. */
let plan = null, planFault = null;
try {
  const records = createJsonlStore(join(REPO, "runs", "evidence", "evidence.jsonl")).readAll();
  const rows = pinnedObservationRows({ repo: REPO, records });
  const resolve = createTenantResolver();
  const partitions = new Map();
  for (const t of resolve.declarations.tenants.filter((x) => x.status === "ACTIVE").map((x) => x.tenantId)) {
    const p = readTenantPartition({ decision: decidePartition(resolve, t), tenantId: t, resolve, rows });
    if (p.items.length) partitions.set(t, p);
  }
  const account = accountPopulation({ start: rows.length, partitions, retired: retiredMembers({ records, entry: EVIDENCE_ROLE_REGISTRY.find((e) => e.role === "RETIRED_CONTAMINATED") }) });
  plan = planSelection({ versions: states, freezes: ctx.store.readAll().events.filter((e) => e.action === "HELDOUT_MECHANISM_FROZEN"), account, committed: COMMITTED_ACCOUNTING, K: C7_BAR.candidatesPerNeed, now: NOW });
} catch (e) { if (!(e instanceof SelectionRefused)) throw e; planFault = e; }

const sealing = governedSealing({ repo: REPO, permission: { ...permission, actorRef: namedActor(argv) }, audit: ctx, store: S, plan, planFault, ownerReadme: OWNER_README, occurredAt: NOW, versions: states });
let run;
try { run = executeGovernedWrite({ ...sealing, action: { ...sealing.action, name: "RECORD_HELDOUT_EVALUATION" } }); } catch (e) { console.error(`🔴 SELECTION STOPPED — ${e.code ?? e.name}: nothing was sealed`); process.exit(4); }
if (run.outcome !== "COMMITTED") {
  console.error(`🔴 SELECTION ${run.outcome} — ${run.faults.map((f) => f.code).join(", ") || "no fault named"}: nothing was selected and nothing was written into S`);
  process.exit(run.outcome === "REFUSED" ? AUTHORISATION_REFUSED_EXIT : 5);
}
const c = plan.counts;
console.log(`\nSEALED · eligible ${c.eligible} · tenants ${c.tenants} · selected ${c.selected} (${c.seatsDescending.join(" + ")}) · remainder ${c.remainder}`);
console.log(`  C7 pairs N7 ${c.pairs} = ${c.matched} matched + ${c.repaired} re-paired (measured at the act; the packet's estimate on constructed identities was ${c.estimatedPairs})`);
console.log(`  commitments · set ${plan.commitments.set} · pairs ${plan.commitments.pairs}`);
console.log(`  🔴 ONE-WAY DOOR: this selection is sealed for good. ${c.tenantsConsumedToCapacity} of ${c.tenants} tenants are consumed to their full eligible capacity (${c.capacitiesDescending.join(" · ")} eligible → ${c.seatsDescending.join(" · ")} sealed) and now hold ZERO unsealed eligible rows, permanently.`);
process.exit(0);
