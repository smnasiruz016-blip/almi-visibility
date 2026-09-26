#!/usr/bin/env node
/**
 * 🔴 F07 · THE HELD-OUT EVALUATION ENTRY POINT (23 September 2026).
 *
 *   node bin/heldout-evaluation.mjs status
 *   node bin/heldout-evaluation.mjs request --mechanism-id=<id> --mechanism-hash=<sha256> --set=<sealed-set id>
 *                                   --commitment=<sha256> --protocol=<id> --purpose=<id> --authority=<propositionId>
 *   node bin/heldout-evaluation.mjs freeze --mechanism-id=<id> --mechanism-hash=<sha256> [--confirm]
 *   request … --key-set=<marking-key id> --key-commitment=<sha256> --scorer-id=<id> --scorer-hash=<sha256>
 *                                   a LINKED grant (F07 Amendment 2): one set, its one linked key, a frozen scorer
 *   score   <every linked request flag> [--confirm]
 *                                   F10 (governance 504dbb9, C4): the ONE scoring run — a linked grant, then the governed
 *                                   route (src/governance/governed-scoring.mjs) through executeGovernedWrite ONLY. Without
 *                                   --confirm nothing is requested or scored. Prints counts and the verdict; never an item.
 *
 * `status` is read-only: the declared sets by role, and — from the audit trail — the freezes and accesses recorded.
 * `request` asks for held-out access and ALWAYS records the decision (an access attempt that is not recorded is F07's
 * own failure clause); it exits 0 when allowed and 3 when refused. `freeze` records a mechanism freeze, only with
 * --confirm. Every write here is an audit event, and the write-gate decision is recorded live before any of them.
 *
 * 🔴 The only declared held-out set is RETIRED, and the sealed case-study store grants no evaluation: every real request
 * is REFUSED and recorded. That is the design working, not a gap — see src/heldout/lifecycle.mjs.
 *
 * Prints ids, codes, hashes and counts only. Never a held-out item, path, label or answer.
 */
import { EVIDENCE_ROLE_REGISTRY as REAL_REGISTRY, SEALED_STORE_ROOTS } from "../config/evidence-roles.mjs";
import { withSyntheticSealedFixture } from "../src/governance/synthetic-sealed-fixture.mjs";
import { writePermission, announceWritePermission, LOCAL, PRODUCTION } from "../src/write-law.mjs";
import { governedAuditContext } from "../src/governance/governed-run.mjs";
import { guardAuthority } from "../src/governance/guard-audit.mjs";
import { writeGateEvent } from "../src/audit-trail/recorder.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { freezeMechanism, requestHeldOutAccess, recordGateDecisions, EVALUATION_ACTIONS } from "../src/heldout/lifecycle.mjs";
import { authorise, authorisationEvent, namedActor, AUTHORISATION_REFUSED_EXIT } from "../src/governance/authorisation.mjs";
import { durableGuardSink } from "../src/governance/guard-audit.mjs";
import { execFileSync } from "node:child_process";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedScoring, versionHash, SCORER_FILES } from "../src/governance/governed-scoring.mjs";
import { resolveSealedStoreRoots } from "../src/governance/sealed-store-roots.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { pinnedObservationRows, decidePartition, readTenantPartition } from "../src/discovery/search-console-partition.mjs";
import { runMechanism, MECHANISM_FILES } from "../src/discovery/human-questions.mjs";
import { PROTOCOL, SCORING_RULE } from "../config/human-questions.mjs";

/* F10 (ruling S): the real registry and store descriptors, plus — ONLY in a verified test context, additive only — an
 * isolated synthetic sealed fixture (src/governance/synthetic-sealed-fixture.mjs). Outside one, naming a fixture refuses. */
const EFFECTIVE = withSyntheticSealedFixture({ registry: REAL_REGISTRY, declared: SEALED_STORE_ROOTS });
const EVIDENCE_ROLE_REGISTRY = EFFECTIVE.registry;
const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const argv = process.argv.slice(2);
const arg = (k) => argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const cmd = argv[0];
if (!["status", "request", "freeze", "score"].includes(cmd)) {
  console.error("usage: node bin/heldout-evaluation.mjs status | request … | freeze … [--confirm] | score … [--confirm]");
  process.exit(2);
}

const NOW = isoSeconds(Date.now());
const correlationId = `run:heldout-evaluation:${cmd}:${NOW}`;
const { authorityRef, authorityHash } = guardAuthority({ now: NOW.slice(0, 10) });
const ctx = { ...governedAuditContext({ repo: REPO, correlationId, authorityRef, authorityHash }), actor: "bin/heldout-evaluation.mjs" };
const H = (e) => e.eventType === "EVALUATION" && e.metadata?.family === "H";

if (cmd === "status") {
  const byRole = EVIDENCE_ROLE_REGISTRY.reduce((m, e) => ((m[e.role] = (m[e.role] ?? 0) + 1), m), {});
  console.log("HELD-OUT EVALUATION — STATUS (counts only)");
  console.log(`  registry entries by role: ${Object.entries(byRole).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
  console.log(`  evaluation sets (HELD_OUT_EVIDENCE, evaluable): ${EVIDENCE_ROLE_REGISTRY.filter((e) => e.role === "HELD_OUT_EVIDENCE" && e.mayEvaluate === true && e.sealed === true).length}`);
  const ev = ctx.store.readAll().events.filter(H);
  for (const a of Object.values(EVALUATION_ACTIONS)) console.log(`  ${a.padEnd(34)} ${ev.filter((e) => e.action === a).length} (allowed ${ev.filter((e) => e.action === a && e.outcome === "ALLOWED").length} · refused ${ev.filter((e) => e.action === a && e.outcome === "REFUSED").length})`);
  process.exit(0);
}

/* ── THE WRITE-GATE DECISION, RECORDED LIVE, BEFORE ANY OTHER EVENT OF THIS RUN ── */
const permission = cmd === "freeze" || cmd === "score" ? announceWritePermission(writePermission({ target: LOCAL, argv, env: process.env })) : { mayWrite: true, mode: "RECORD", reason: "an access decision is always recorded" };
const gates = [
  writeGateEvent({ permission, target: "local", action: cmd === "freeze" ? "RECORD_MECHANISM_FREEZE" : cmd === "score" ? "RECORD_HELDOUT_SCORING_RUN" : "RECORD_HELDOUT_ACCESS_DECISION", actor: ctx.actor, softwareVersion: ctx.softwareVersion, correlationId, occurredAt: NOW, authorityRef, authorityHash }),
  writeGateEvent({ permission: writePermission({ target: PRODUCTION, argv, env: process.env }), target: "production", action: "WRITE_BEYOND_THIS_MACHINE", actor: ctx.actor, softwareVersion: ctx.softwareVersion, correlationId, occurredAt: NOW, authorityRef, authorityHash }),
];
recordGateDecisions({ audit: ctx, drafts: gates });

/* 🔴 F04: recording an evaluation event (a freeze, an access decision) is an EVALUATION action the named actor must be
 * AUTHORISED for — decided once, recorded through the same governed store, before the freeze or the request. A dry freeze
 * records nothing, so it is not decided. */
if ((cmd !== "freeze" && cmd !== "score") || permission.mayWrite) {
  const decision = authorise({ actorRef: namedActor(argv), action: "RECORD_HELDOUT_EVALUATION", scope: { scopeType: "GLOBAL_PRODUCT" }, resourceRef: `heldout-evaluation:${cmd}`, now: NOW });
  durableGuardSink({ store: ctx.store, actor: ctx.actor, softwareVersion: ctx.softwareVersion, correlationId: `${correlationId}:authorisation`, authorityRef: ctx.authorityRef ?? authorityRef, authorityHash: ctx.authorityHash ?? authorityHash }).emit(authorisationEvent(decision));
  if (!decision.allowed) { console.error(`🔴 AUTHORISATION REFUSED — RECORD_HELDOUT_EVALUATION: ${decision.outcome} (${decision.reason}); nothing was recorded`); process.exit(AUTHORISATION_REFUSED_EXIT); }
}

if (cmd === "score" && !permission.mayWrite) { console.log("[dry-run] nothing is requested and nothing is scored — the one scoring run needs --confirm"); process.exit(0); }

if (cmd === "freeze") {
  if (!permission.mayWrite) { console.log("[dry-run] the freeze is not recorded — add --confirm"); process.exit(0); }
  const f = freezeMechanism({ audit: ctx, mechanismId: arg("mechanism-id"), mechanismHash: arg("mechanism-hash"), frozenAt: NOW });
  console.log(`FROZEN ${f.mechanismId} ${f.mechanismHash.slice(0, 12)}… as ${f.eventId}`);
  process.exit(0);
}

const g = requestHeldOutAccess({
  audit: ctx,
  registry: EVIDENCE_ROLE_REGISTRY,
  request: {
    mechanismId: arg("mechanism-id"), mechanismHash: arg("mechanism-hash"), sealedSetId: arg("set"),
    populationCommitment: arg("commitment"), protocolId: arg("protocol"), purpose: arg("purpose"),
    /* --authority-scope (F10): the scope the evaluator authority is resolved in, "/"-separated. DEFAULT "ALMIVISIBILITY" —
     * unchanged for every earlier caller; an F10 scoring run names its own row's scope (ALMIVISIBILITY/F10). */
    evaluatorAuthority: arg("authority") ? { propositionId: arg("authority"), scope: (arg("authority-scope") ?? "ALMIVISIBILITY").split("/") } : null,
    at: NOW, role: "evaluator",
    /* F07 Amendment 2: naming a marking key asks for a LINKED grant — then the key, its commitment and the frozen scorer
     * are all required, and a missing one is refused and recorded (src/heldout/lifecycle.mjs LINKED_REQUEST_FIELDS). */
    ...(arg("key-set") || arg("key-commitment") || arg("scorer-id") || arg("scorer-hash") ? { keySetId: arg("key-set"), keyCommitment: arg("key-commitment"), scorerId: arg("scorer-id"), scorerHash: arg("scorer-hash") } : {}),
  },
});
console.log(`${g.allowed ? "ALLOWED" : "REFUSED"} ${g.code}${g.allowed ? ` · status ${g.status} · untouched ${g.untouched}` : ""} · recorded as ${g.eventId}`);
if (cmd !== "score" || !g.allowed) process.exit(g.allowed ? 0 : 3);

/* ── F10 · C4 · THE ONE SCORING RUN, THROUGH THE GOVERNED BOUNDARY ONLY (owner ruling 1.2, _handoffs 3adb716) ──────────────
 * The frozen mechanism runs INSIDE this run over the set's items, each item's wording obtained only from its own tenant's
 * partition (F02) — an item no partition holds gets NO entry, and the run is then INVALID (ruling 1.3), never filled in. */
const stores = resolveSealedStoreRoots({ declared: EFFECTIVE.declared });
if (EFFECTIVE.synthetic) console.log(`SYNTHETIC SEALED FIXTURE APPLIED (verified test context only) — +${EFFECTIVE.synthetic.entries} entries · +${EFFECTIVE.synthetic.stores} store(s)`);
const setEntry = EVIDENCE_ROLE_REGISTRY.find((e) => e.id === arg("set"));
const outputsFor = (itemIds) => {
  const rows = pinnedObservationRows({ repo: REPO });
  const resolve = createTenantResolver();
  const wording = new Map();
  for (const tenantId of setEntry?.tenantScope ?? []) {
    const part = readTenantPartition({ decision: decidePartition(resolve, tenantId), tenantId, resolve, rows });
    for (const it of part.items) wording.set(it.itemId, it.query);
  }
  const present = itemIds.filter((id) => wording.has(id)).map((id) => ({ itemId: id, query: wording.get(id), sourceRowIds: [id] }));
  return new Map([...runMechanism(present)].map(([id, o]) => [id, { classes: [...o.classes] }]));
};
const scoring = governedScoring({
  repo: REPO, permission: { ...permission, actorRef: namedActor(argv) }, audit: ctx, grant: g, registry: EVIDENCE_ROLE_REGISTRY, stores,
  currentMechanismHash: versionHash(REPO, MECHANISM_FILES), currentScorerHash: versionHash(REPO, SCORER_FILES), outputsFor,
  protocol: PROTOCOL, rule: SCORING_RULE, occurredAt: NOW, trackedFiles: () => execFileSync("git", ["-C", REPO, "ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean),
});
let run;
try { run = executeGovernedWrite({ ...scoring, action: { ...scoring.action, name: "RECORD_HELDOUT_EVALUATION" } }); } catch (e) { console.error(`🔴 SCORING RUN STOPPED — ${e.code ?? e.name}: no result was released`); process.exit(4); }
const rel = scoring.release();
console.log(`SCORING ${run.outcome}${run.faults.length ? ` · ${run.faults.map((f) => f.code + (f.why ? `(${f.why})` : "")).join(", ")}` : ""}`);
if (rel) console.log(`  release ${rel.combination.slice(0, 16)}… · declared ${rel.declared} · D ${rel.denominator} · verdict ${rel.verdict.result}${rel.verdict.reason ? ` (${rel.verdict.reason})` : ""} · ${Object.entries(rel.tables).map(([c, t]) => `${c} tp${t.tp}-fp${t.fp}-fn${t.fn}-tn${t.tn}`).join(" · ")}`);
process.exit(run.outcome === "COMMITTED" || run.outcome === "ALREADY_COMMITTED" ? 0 : run.outcome === "REFUSED" ? 5 : 4);
