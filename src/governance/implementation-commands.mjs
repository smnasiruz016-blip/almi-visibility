/**
 * 🔴 F74 · SAFE IMPLEMENTATION COMMAND GENERATION (acceptance _handoffs afe61ef, AlmiVisibility_F74_ACCEPTANCE_2026-10-18.md, RR-284).
 *
 * One approved action in, one bounded, reviewable command out — or a refusal by name:
 *
 *   C1 ONLY APPROVED   the action names its approval record: an owner decision or GREEN of the governance repository (beta-g decision E,
 *                      18 Oct 2026), admitted to the engine's authority corpus as CURRENT with an OWNER issuer, named by its path and its
 *                      committed sha256 (the corpus's own contentHash). Anything else is refused, named.
 *   C2 ONE PER ACTION  each action gives exactly one command; an action id seen twice is refused, never merged or split
 *   C3 BOUNDED         its scope (files or pages), what must never happen and its stop conditions — each non-empty, or refused
 *   C4 PROOF STEPS     at least one step that proves the change landed, or refused
 *   C5 NO SECRETS      the engine's own secret firewall (src/intake/secrets.mjs) over every string of the command; a credential is named
 *                      by its name only — a secret-shaped value is refused, reported by path and detector, never by value
 *
 * Pure: nothing is run, fetched, written or deployed. Names no product, host or tenant.
 */
import { createHash } from "node:crypto";
import { findSecrets } from "../intake/secrets.mjs";

export const COMMAND_REFUSAL = Object.freeze({
  NO_APPROVAL: "NO_APPROVAL_RECORD_NAMED", NOT_ADMITTED: "APPROVAL_RECORD_NOT_IN_THE_CORPUS", NOT_CURRENT: "APPROVAL_RECORD_NOT_CURRENT",
  NOT_OWNER: "APPROVAL_RECORD_NOT_THE_OWNERS", NOT_A_DECISION: "APPROVAL_RECORD_NOT_A_DECISION_OR_GREEN", HASH_DIFFERS: "APPROVAL_RECORD_BYTES_DIFFER",
  DUPLICATE: "ACTION_SEEN_TWICE", NO_SCOPE: "NO_SCOPE", NO_NEVER: "NO_MUST_NEVER_HAPPEN", NO_STOP: "NO_STOP_CONDITIONS", NO_PROOF: "NO_PROOF_STEP", SECRET: "SECRET_VALUE_IN_COMMAND",
});
/** the name of an approval record: an owner decision, a ruling or a GREEN — never a command, a report or a draft */
const DECISION_NAME = /(OWNER_DECISION|BETA_G_DECISION|OWNER_RULING|OWNER_GREEN|_GREEN_)/;
const nonEmpty = (xs) => Array.isArray(xs) && xs.some((x) => typeof x === "string" && x.trim() !== "");

/** C1 · the approval record an action names, read back from the corpus — or the refusal. */
export function approvalOf(action, corpus) {
  const a = action?.approval;
  if (!a || typeof a.path !== "string" || typeof a.sha256 !== "string") return { refused: COMMAND_REFUSAL.NO_APPROVAL };
  const rec = (corpus ?? []).find((r) => r.authorityId === `_handoffs:${a.path}`);
  if (!rec) return { refused: COMMAND_REFUSAL.NOT_ADMITTED };
  if (rec.status !== "CURRENT") return { refused: COMMAND_REFUSAL.NOT_CURRENT };
  if (rec.issuer?.class !== "OWNER") return { refused: COMMAND_REFUSAL.NOT_OWNER };
  if (!DECISION_NAME.test(a.path)) return { refused: COMMAND_REFUSAL.NOT_A_DECISION };
  if (rec.contentHash !== a.sha256) return { refused: COMMAND_REFUSAL.HASH_DIFFERS };
  return { record: rec };
}

/** The one command of one action, as text a developer or an agent reads in one place. */
export function renderCommand(action, record) {
  const list = (xs) => xs.filter((x) => typeof x === "string" && x.trim() !== "").map((x) => `- ${x}`).join("\n");
  return [
    `COMMAND ${action.actionId} — ${action.title}`,
    `APPROVED BY: ${action.approval.path} (sha256 ${record.contentHash})`,
    `CHANGE:\n${action.change}`,
    `SCOPE (only these):\n${list(action.scope)}`,
    `MUST NEVER HAPPEN:\n${list(action.never)}`,
    `STOP IF:\n${list(action.stop)}`,
    `PROVE IT LANDED:\n${list(action.proofs)}`,
  ].join("\n\n");
}

/** Every action → exactly one command or one refusal. */
export function generateCommands({ actions, corpus }) {
  const seen = new Set();
  const out = (actions ?? []).map((action) => {
    const refuse = (code, detail = null) => Object.freeze({ actionId: action?.actionId ?? null, refused: code, ...(detail ? { detail } : {}) });
    if (seen.has(action?.actionId)) return refuse(COMMAND_REFUSAL.DUPLICATE);
    seen.add(action?.actionId);
    const a = approvalOf(action, corpus);
    if (a.refused) return refuse(a.refused);
    if (!nonEmpty(action.scope)) return refuse(COMMAND_REFUSAL.NO_SCOPE);
    if (!nonEmpty(action.never)) return refuse(COMMAND_REFUSAL.NO_NEVER);
    if (!nonEmpty(action.stop)) return refuse(COMMAND_REFUSAL.NO_STOP);
    if (!nonEmpty(action.proofs)) return refuse(COMMAND_REFUSAL.NO_PROOF);
    const text = renderCommand(action, a.record);
    const secrets = findSecrets({ action, text });
    if (secrets.length) return refuse(COMMAND_REFUSAL.SECRET, secrets.map((s) => `${s.path} ${s.detector}`));
    return Object.freeze({ actionId: action.actionId, commandId: createHash("sha256").update(text).digest("hex").slice(0, 16), approval: action.approval.path, text });
  });
  const commands = out.filter((x) => x.text), refused = out.filter((x) => x.refused);
  return Object.freeze({ actions: (actions ?? []).length, commands: Object.freeze(commands), refused: Object.freeze(refused) });
}
