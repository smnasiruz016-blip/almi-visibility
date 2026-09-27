#!/usr/bin/env node
/**
 * 🔴 F10 · C3 · THE ONE GOVERNED N=100 SELECTION — sealed into storage S (command ec3bbaf §4; F10 Amendment 1, 2ee6c2a).
 *
 *   node bin/f10-select.mjs status                          read-only: the four versions and the store — codes and counts only
 *   node bin/f10-select.mjs seal --actor=<ref> [--confirm]  the ONE selection. Without --confirm nothing is written.
 *
 * `seal` refuses at the first failed precondition (src/discovery/f10-selection.mjs) and records its decision on the audit trail.
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
import { guardAuthority, durableGuardSink } from "../src/governance/guard-audit.mjs";
import { writePermission, announceWritePermission, LOCAL, PRODUCTION } from "../src/write-law.mjs";
import { writeGateEvent } from "../src/audit-trail/recorder.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { recordGateDecisions } from "../src/heldout/lifecycle.mjs";
import { authorise, authorisationEvent, namedActor, AUTHORISATION_REFUSED_EXIT } from "../src/governance/authorisation.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { pinnedObservationRows, decidePartition, readTenantPartition } from "../src/discovery/search-console-partition.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { accountPopulation, retiredMembers } from "../src/discovery/human-question-population.mjs";
import { planSelection, sealSelection, SelectionRefused, OWNER_README } from "../src/discovery/f10-selection.mjs";
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

/* ── THE WRITE-GATE DECISION AND THE AUTHORISATION, RECORDED BEFORE ANYTHING ELSE ── */
const permission = announceWritePermission(writePermission({ target: LOCAL, argv, env: process.env }));
if (!permission.mayWrite) { console.log("[dry-run] nothing is selected and nothing is written — the one selection needs --confirm"); process.exit(0); }
recordGateDecisions({ audit: ctx, drafts: [
  writeGateEvent({ permission, target: "local", action: "RECORD_F10_SELECTION", actor: ctx.actor, softwareVersion: ctx.softwareVersion, correlationId, occurredAt: NOW, authorityRef, authorityHash }),
  writeGateEvent({ permission: writePermission({ target: PRODUCTION, argv, env: process.env }), target: "production", action: "WRITE_BEYOND_THIS_MACHINE", actor: ctx.actor, softwareVersion: ctx.softwareVersion, correlationId, occurredAt: NOW, authorityRef, authorityHash }),
] });
const decision = authorise({ actorRef: namedActor(argv), action: "RECORD_HELDOUT_EVALUATION", scope: { scopeType: "GLOBAL_PRODUCT" }, resourceRef: "f10-select:seal", now: NOW });
const sink = durableGuardSink({ store: ctx.store, actor: ctx.actor, softwareVersion: ctx.softwareVersion, correlationId, authorityRef, authorityHash });
sink.emit(authorisationEvent(decision));
if (!decision.allowed) { console.error(`🔴 AUTHORISATION REFUSED — ${decision.outcome} (${decision.reason}); nothing was selected`); process.exit(AUTHORISATION_REFUSED_EXIT); }

/* The selection's own decision goes straight to the governed store (the guard sink carries only guard keys); the store validates
 * it — metadata-only, short scalars. One decision per run: the identity carries the run, the instant and the action. */
const record = (outcome, reasonCode, metadata) => ctx.store.append({
  eventType: "EVALUATION", action: "HELDOUT_SET_SEALED", outcome, reasonCode, occurredAt: NOW,
  actor: ctx.actor, actorType: "ENGINE", scopeType: "GLOBAL_PRODUCT", tenantId: null, subjectId: null,
  authorityRef, authorityHash, softwareVersion: ctx.softwareVersion, evidenceRefs: [], correlationId, parentEventId: null,
  migration: false, migrationSource: null, migratedAt: null, metadata: { family: "H", ...metadata },
}, { identity: { action: "HELDOUT_SET_SEALED", occurredAt: NOW, correlationId, seq: 1 } });

try {
  if (!S) throw new SelectionRefused("SEALED_STORE_UNLOCATED", `storage S is not located (${stores.codes["f10-marking-key"]})`);
  const records = createJsonlStore(join(REPO, "runs", "evidence", "evidence.jsonl")).readAll();
  const rows = pinnedObservationRows({ repo: REPO, records });
  const resolve = createTenantResolver();
  const partitions = new Map();
  for (const t of resolve.declarations.tenants.filter((x) => x.status === "ACTIVE").map((x) => x.tenantId)) {
    const p = readTenantPartition({ decision: decidePartition(resolve, t), tenantId: t, resolve, rows });
    if (p.items.length) partitions.set(t, p);
  }
  const account = accountPopulation({ start: rows.length, partitions, retired: retiredMembers({ records, entry: EVIDENCE_ROLE_REGISTRY.find((e) => e.role === "RETIRED_CONTAMINATED") }) });
  const plan = planSelection({ versions: states, freezes: ctx.store.readAll().events.filter((e) => e.action === "HELDOUT_MECHANISM_FROZEN"), account, committed: COMMITTED_ACCOUNTING, K: C7_BAR.candidatesPerNeed, now: NOW });
  sealSelection({ store: S, plan, ownerReadme: OWNER_README });
  const c = plan.counts;
  record("RECORDED", "F10_SELECTION_SEALED_ONE_WAY_DOOR", {
    eligible: String(c.eligible), tenants: String(c.tenants), selected: String(c.selected), remainder: String(c.remainder),
    seats: c.seatsDescending.join("-"), capacities: c.capacitiesDescending.join("-"), pairs: String(c.pairs), matched: String(c.matched), repaired: String(c.repaired), estimatedPairs: String(c.estimatedPairs),
    tenantsConsumedToCapacity: String(c.tenantsConsumedToCapacity), setCommitment: plan.commitments.set, pairsCommitment: plan.commitments.pairs,
    oneWayDoor: "SEALING_IS_IRREVERSIBLE_SIX_TENANTS_HOLD_ZERO_UNSEALED_ELIGIBLE_ROWS",
    versions: states.map((s) => `${s.id}@${s.codeHash.slice(0, 12)}`).join(","),
  });
  console.log(`\nSEALED · eligible ${c.eligible} · tenants ${c.tenants} · selected ${c.selected} (${c.seatsDescending.join(" + ")}) · remainder ${c.remainder}`);
  console.log(`  C7 pairs N7 ${c.pairs} = ${c.matched} matched + ${c.repaired} re-paired (measured at the act; the packet's estimate on constructed identities was ${c.estimatedPairs})`);
  console.log(`  commitments · set ${plan.commitments.set} · pairs ${plan.commitments.pairs}`);
  console.log(`  🔴 ONE-WAY DOOR: this selection is sealed for good. ${c.tenantsConsumedToCapacity} of ${c.tenants} tenants are consumed to their full eligible capacity (${c.capacitiesDescending.join(" · ")} eligible → ${c.seatsDescending.join(" · ")} sealed) and now hold ZERO unsealed eligible rows, permanently.`);
  process.exit(0);
} catch (e) {
  if (!(e instanceof SelectionRefused)) throw e;
  record("REFUSED", e.code, { selected: "0" });
  console.error(`🔴 SELECTION REFUSED — ${e.code}: nothing was selected and nothing was written into S`);
  process.exit(5);
}
