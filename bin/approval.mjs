#!/usr/bin/env node
/**
 * 🔴 F04 · RECORD AN APPROVAL EVENT — issue, revoke or consume — through the one governed boundary.
 *
 *   node bin/approval.mjs issue   --record=<path to one approval JSON> --actor=<declared> [--confirm]
 *   node bin/approval.mjs revoke  --approval=<approval id> --reason=<CODE> --actor=<declared> [--confirm]
 *   node bin/approval.mjs consume --approval=<approval id> --execution=<ref> --actor=<declared> [--confirm]
 *   node bin/approval.mjs show                                                   (read-only: the computed current state)
 *
 * The tool RECORDS; it approves nothing. An ISSUED record is valid only when it names a declared HUMAN approver who is not
 * the executor and points at the owner-issued governance record it transcribes (src/governance/approval-registry.mjs). The
 * recording itself is a governed action of the APPROVAL family, authorised for the actor the run names — so a model, which
 * holds no allow, cannot even record one, and nothing the recorder is makes it the approver.
 *
 * Dry run by default. Writes only config/governance/approvals.jsonl, one line at a time; history is never edited.
 */
import { readFileSync } from "node:fs";

import { writePermission, announceWritePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedRecordAppend } from "../src/governance/governed-run.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { APPROVALS_FILE, readApprovals, namedActor, AUTHORISATION_REFUSED_EXIT } from "../src/governance/authorisation.mjs";
import { approvalFaults, issuedEvent, revokedEvent, consumedEvent } from "../src/governance/approval-registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
const verb = process.argv[2];
const USAGE = "🔴 usage: node bin/approval.mjs issue --record=<file> | revoke --approval=<id> --reason=<CODE> | consume --approval=<id> --execution=<ref> | show  — plus --actor=<declared> [--confirm]";

const current = readApprovals();
if (!current.readable) { console.error("🔴 REFUSED — REGISTRY_UNREADABLE"); process.exit(1); }

if (verb === "show") {
  for (const a of current.approvals.values()) {
    const state = a.revoked ? "REVOKED" : a.oneUse && a.consumed ? "CONSUMED" : a.expiresAt && a.expiresAt <= isoSeconds(Date.now()) ? "EXPIRED" : "LIVE";
    console.log(`${a.approvalId}  ${a.action}  ${a.scope.scopeType}  approver ${a.approverClass}  executor ${a.executorClass}  ${state}`);
  }
  console.log(`${current.approvals.size} approval(s) from ${current.events} event(s)`);
  process.exit(0);
}

const instant = isoSeconds(Date.now());
const recordedBy = namedActor(process.argv);
let event, action;
if (verb === "issue") {
  /* The record is only READ from --record (a write is confined; a read of the transcript to be recorded is not). */
  const path = arg("record");
  if (!path) { console.error(USAGE); process.exit(2); }
  const record = JSON.parse(readFileSync(path, "utf8"));
  const faults = approvalFaults(record, { now: instant });
  if (current.approvals.has(record?.approvalId)) faults.push("APPROVAL_ID_ALREADY_ISSUED");
  if (faults.length) { console.error(`🔴 REFUSED — ${faults.join(", ")}`); process.exit(1); }
  event = issuedEvent(record, { recordedBy, recordedAt: instant });
  action = "ISSUE_APPROVAL";
} else if (verb === "revoke" || verb === "consume") {
  const id = arg("approval");
  const a = current.approvals.get(id);
  if (!a) { console.error(`🔴 REFUSED — APPROVAL_UNKNOWN`); process.exit(1); }
  if (a.revoked) { console.error("🔴 REFUSED — APPROVAL_REVOKED"); process.exit(1); }
  if (verb === "revoke") {
    const reasonCode = arg("reason");
    if (!/^[A-Z][A-Z0-9_]{2,80}$/.test(reasonCode ?? "")) { console.error(USAGE); process.exit(2); }
    event = revokedEvent(id, { recordedBy, recordedAt: instant, reasonCode });
    action = "REVOKE_APPROVAL";
  } else {
    const executionRef = arg("execution");
    if (!executionRef || executionRef.length > 200) { console.error(USAGE); process.exit(2); }
    if (a.oneUse && a.consumed) { console.error("🔴 REFUSED — APPROVAL_CONSUMED"); process.exit(1); }
    event = consumedEvent(id, { recordedBy, recordedAt: instant, executionRef });
    action = "CONSUME_APPROVAL";
  }
} else { console.error(USAGE); process.exit(2); }

const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));
const out = executeGovernedWrite(governedRecordAppend({
  repo: REPO, permission, target: `${REPO}${APPROVALS_FILE}`, targetClass: "REPOSITORY_FILE",
  /* A stored line declares its occurrence by its own fields: the event and the approval it concerns. */
  record: event, occurrenceKeyOf: (r) => `${r?.event}:${r?.approval?.approvalId ?? r?.approvalId}`,
  action, occurredAt: instant, correlationId: `run:approval:${verb}:${instant}`,
}));
console.log(`${out.outcome}${out.authorisation ? ` (${out.authorisation})` : ""} — ${permission.mayWrite ? `${event.event} appended to ${APPROVALS_FILE}` : "dry run: nothing written"}`);
if (out.authorisation) process.exit(AUTHORISATION_REFUSED_EXIT);
process.exit(out.outcome === "COMMITTED" || out.outcome === "ALREADY_COMMITTED" || (out.outcome === "REFUSED" && !permission.mayWrite) ? 0 : 1);
