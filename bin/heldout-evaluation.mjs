#!/usr/bin/env node
/**
 * 🔴 F07 · THE HELD-OUT EVALUATION ENTRY POINT (23 September 2026).
 *
 *   node bin/heldout-evaluation.mjs status
 *   node bin/heldout-evaluation.mjs request --mechanism-id=<id> --mechanism-hash=<sha256> --set=<sealed-set id>
 *                                   --commitment=<sha256> --protocol=<id> --purpose=<id> --authority=<propositionId>
 *   node bin/heldout-evaluation.mjs freeze --mechanism-id=<id> --mechanism-hash=<sha256> [--confirm]
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
import { EVIDENCE_ROLE_REGISTRY } from "../config/evidence-roles.mjs";
import { writePermission, announceWritePermission, LOCAL, PRODUCTION } from "../src/write-law.mjs";
import { governedAuditContext } from "../src/governance/governed-run.mjs";
import { guardAuthority } from "../src/governance/guard-audit.mjs";
import { writeGateEvent } from "../src/audit-trail/recorder.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { freezeMechanism, requestHeldOutAccess, recordGateDecisions, EVALUATION_ACTIONS } from "../src/heldout/lifecycle.mjs";
import { authorise, authorisationEvent, namedActor, AUTHORISATION_REFUSED_EXIT } from "../src/governance/authorisation.mjs";
import { durableGuardSink } from "../src/governance/guard-audit.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const argv = process.argv.slice(2);
const arg = (k) => argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const cmd = argv[0];
if (!["status", "request", "freeze"].includes(cmd)) {
  console.error("usage: node bin/heldout-evaluation.mjs status | request … | freeze … [--confirm]");
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
const permission = cmd === "freeze" ? announceWritePermission(writePermission({ target: LOCAL, argv, env: process.env })) : { mayWrite: true, mode: "RECORD", reason: "an access decision is always recorded" };
const gates = [
  writeGateEvent({ permission, target: "local", action: cmd === "freeze" ? "RECORD_MECHANISM_FREEZE" : "RECORD_HELDOUT_ACCESS_DECISION", actor: ctx.actor, softwareVersion: ctx.softwareVersion, correlationId, occurredAt: NOW, authorityRef, authorityHash }),
  writeGateEvent({ permission: writePermission({ target: PRODUCTION, argv, env: process.env }), target: "production", action: "WRITE_BEYOND_THIS_MACHINE", actor: ctx.actor, softwareVersion: ctx.softwareVersion, correlationId, occurredAt: NOW, authorityRef, authorityHash }),
];
recordGateDecisions({ audit: ctx, drafts: gates });

/* 🔴 F04: recording an evaluation event (a freeze, an access decision) is an EVALUATION action the named actor must be
 * AUTHORISED for — decided once, recorded through the same governed store, before the freeze or the request. A dry freeze
 * records nothing, so it is not decided. */
if (cmd !== "freeze" || permission.mayWrite) {
  const decision = authorise({ actorRef: namedActor(argv), action: "RECORD_HELDOUT_EVALUATION", scope: { scopeType: "GLOBAL_PRODUCT" }, resourceRef: `heldout-evaluation:${cmd}`, now: NOW });
  durableGuardSink({ store: ctx.store, actor: ctx.actor, softwareVersion: ctx.softwareVersion, correlationId: `${correlationId}:authorisation`, authorityRef: ctx.authorityRef ?? authorityRef, authorityHash: ctx.authorityHash ?? authorityHash }).emit(authorisationEvent(decision));
  if (!decision.allowed) { console.error(`🔴 AUTHORISATION REFUSED — RECORD_HELDOUT_EVALUATION: ${decision.outcome} (${decision.reason}); nothing was recorded`); process.exit(AUTHORISATION_REFUSED_EXIT); }
}

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
    evaluatorAuthority: arg("authority") ? { propositionId: arg("authority"), scope: ["ALMIVISIBILITY"] } : null,
    at: NOW, role: "evaluator",
  },
});
console.log(`${g.allowed ? "ALLOWED" : "REFUSED"} ${g.code}${g.allowed ? ` · status ${g.status} · untouched ${g.untouched}` : ""} · recorded as ${g.eventId}`);
process.exit(g.allowed ? 0 : 3);
