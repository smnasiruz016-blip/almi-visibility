/**
 * 🔴 GOVERNED KEY REGISTRATION AND PRE-SCORING KEY PREFLIGHT (command af4e9c8, Part D1 · F10 Acceptance Amendment 3).
 *
 * A marking key cannot be read through the lifecycle before it is registered (a linked grant needs a registered key), and the
 * lifecycle may not change (it is part of two frozen scorer versions). So this reader does the ONE thing registration needs —
 * the key's row count and full commitment — under three guards, each a pinned FAILURE CONDITION:
 *
 *   G1 · ACCESS BEFORE VALUE. A durable ACCESS event is appended to the governed audit store, and the store's witness is checked
 *        EQUAL to the trail INCLUDING that event, BEFORE any key byte is read. No store, no witness, a witness not EQUAL, or an
 *        append that fails → REFUSED, recorded, and no key byte is read.
 *   G2 · NO LABEL OUT. The result is the row count, the full commitment (the lifecycle's own keyCommitment over the same relative
 *        paths the scorer reads) and codes. No label, item, class, answer or count per class is returned, printed or recorded.
 *   G3 · REFUSED BEFORE ANY CLAIM. A key that is unparseable, duplicated, inconsistent, INCOMPLETE or wider than its linked set
 *        (checked without reading the set: the key's item ids must reproduce the set's REGISTERED commitment), and — in VERIFY
 *        mode — a key that is unregistered or whose bytes changed since registration, is REFUSED here. VERIFY runs before the
 *        scoring grant is requested, so a bad key never reaches a grant, a claim or the once-only run.
 *
 * It records its access with its own action (HELDOUT_KEY_ACCESS) and never names the linked set as `sealedSetId`, so it cannot
 * change the scoring grant's access status. Generic: it knows no subject, tenant, store location or class vocabulary of its own.
 */
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { keyCommitment, parseKeyRows, populationCommitment } from "./lifecycle.mjs";
import { metadataFaults } from "../audit-trail/event.mjs";
import { isDurableDecision } from "../governance/guard-audit.mjs";
import { storeFiles } from "../governance/sealed-store-roots.mjs";
import { isoSeconds } from "../audit-trail/store.mjs";

export const KEY_ACTIONS = Object.freeze({ ACCESS: "HELDOUT_KEY_ACCESS", MEASURED: "HELDOUT_KEY_MEASURED" });
export const KEY_MODES = Object.freeze(["MEASURE", "VERIFY"]);

export class KeyRegistrationRefused extends Error {
  constructor(code, why) { super(`${code}: ${why}`); this.name = "KeyRegistrationRefused"; this.code = code; }
}

function emit(audit, { action, outcome, reasonCode, metadata, occurredAt }) {
  const md = { family: "H", ...metadata };
  const faults = metadataFaults(md);
  if (faults.length) throw new KeyRegistrationRefused("KEY_EVENT_NOT_METADATA_ONLY", faults.map((f) => f.code).join(","));
  const draft = {
    eventType: "EVALUATION", action, outcome, reasonCode, occurredAt,
    actor: audit.actor, actorType: "ENGINE", scopeType: "GLOBAL_PRODUCT", tenantId: null, subjectId: null,
    authorityRef: audit.authorityRef ?? null, authorityHash: audit.authorityHash ?? null, softwareVersion: audit.softwareVersion,
    evidenceRefs: [], correlationId: audit.correlationId, parentEventId: null,
    migration: false, migrationSource: null, migratedAt: null, metadata: md,
  };
  if (!isDurableDecision(draft)) throw new KeyRegistrationRefused("KEY_EVENT_NOT_DURABLE", `${action} would be kept off the trail`);
  const seq = audit.store.readAll().events.filter((e) => e.action === action).length + 1;
  return audit.store.append(draft, { identity: { action, occurredAt, correlationId: audit.correlationId, seq } });
}

/**
 * Measure (or verify) one marking key.
 *   audit      { store, actor, correlationId, softwareVersion, authorityRef?, authorityHash? } — the governed audit context
 *   witness    { status(lines) } — the store's out-of-tree witness, or null (then G1 refuses)
 *   trailLines () → the trail's current lines (what the witness compares)
 *   registry   the evidence-role registry        stores { roots: { name: dir|null } }
 *   spec       { keyId, root, prefix, linkedSetId, classes, exclusions }
 *   mode       "MEASURE" (registration) | "VERIFY" (before a scoring grant)
 * Returns { rows, commitment, mode }. Throws KeyRegistrationRefused — every refusal is recorded first.
 */
export function measureKey({ audit, witness, trailLines, registry, stores, spec, mode, read = (p) => readFileSync(p), list = storeFiles, now = () => isoSeconds(Date.now()) }) {
  const at = now();
  const meta = { keyId: String(spec?.keyId ?? "NONE"), linkedSet: String(spec?.linkedSetId ?? "NONE"), root: String(spec?.root ?? "NONE"), mode: String(mode) };
  const refuse = (code, why) => {
    emit(audit, { action: KEY_ACTIONS.MEASURED, outcome: "REFUSED", reasonCode: code, occurredAt: at, metadata: meta });
    throw new KeyRegistrationRefused(code, why);
  };
  if (!KEY_MODES.includes(mode)) refuse("KEY_MODE_UNKNOWN", "a key is measured or verified — never guessed");
  const set = (registry ?? []).find((e) => e?.id === spec?.linkedSetId);
  if (!set || set.role !== "HELD_OUT_EVIDENCE" || set.sealed !== true) refuse("LINKED_SET_UNREGISTERED", "the key's linked set is not a registered sealed HELD_OUT_EVIDENCE entry");
  /* VERIFY: an unregistered key is refused BEFORE any read — there is nothing lawful to compare it with. */
  const registered = (registry ?? []).filter((e) => e?.role === "MARKING_KEY" && e.linkedSet === spec.linkedSetId);
  if (mode === "VERIFY" && (registered.length !== 1 || registered[0].id !== spec.keyId)) refuse("KEY_UNREGISTERED", "the key is not the one registered MARKING_KEY of its linked set");
  const dir = stores?.roots?.[spec.root];
  if (!dir) refuse("SEALED_STORE_UNLOCATED", "the key's store is not located");
  const prefix = String(spec.prefix ?? "").replace(/\\/g, "/").replace(/\/?$/, "/");
  const files = list(dir).filter((p) => p.startsWith(prefix));
  if (!files.length) refuse("KEY_ABSENT", "no key file exists under the declared prefix");

  // ── G1 · the durable ACCESS, then the witness — BEFORE any key byte is read ──
  let access;
  try { access = emit(audit, { action: KEY_ACTIONS.ACCESS, outcome: "ALLOWED", reasonCode: `KEY_${mode}_READ`, occurredAt: at, metadata: { ...meta, files: String(files.length) } }); }
  catch (e) { if (e instanceof KeyRegistrationRefused) throw e; throw new KeyRegistrationRefused("ACCESS_NOT_RECORDED", "the ACCESS event could not be appended — no key byte was read"); }
  if (!witness || typeof witness.status !== "function") refuse("WITNESS_UNAVAILABLE", "no witness checks this store — no key byte was read");
  const rel = witness.status(trailLines());
  if (rel?.relation !== "EQUAL") refuse("WITNESS_NOT_EQUAL", `the witness is ${rel?.relation ?? "unknown"} after the ACCESS append — no key byte was read`);

  // ── only now: the bytes, the commitment, the checks. Nothing but a count and a hash leaves. ──
  const bytes = Object.fromEntries(files.map((p) => [p, read(join(dir, p))]));
  const commitment = keyCommitment(bytes);
  const parsed = parseKeyRows(Object.values(bytes).map((b) => Buffer.from(b).toString("utf8")), { classes: spec.classes ?? [], exclusions: spec.exclusions ?? [] });
  if (parsed.fault) refuse(`KEY_${parsed.fault}`, "the key does not parse as one well-formed row per item");
  const rows = parsed.rows.size;
  if (populationCommitment([...parsed.rows.keys()]) !== set.contentHash) refuse("KEY_NOT_THE_LINKED_SET", "the key's items do not reproduce the linked set's registered commitment — incomplete, extra or foreign rows");
  if (mode === "VERIFY") {
    if (registered[0].contentHash !== commitment) refuse("KEY_CHANGED_SINCE_REGISTRATION", "the key's bytes no longer reproduce its registered commitment");
  }
  emit(audit, { action: KEY_ACTIONS.MEASURED, outcome: "RECORDED", reasonCode: `KEY_${mode}_PASSED`, occurredAt: at, metadata: { ...meta, rows: String(rows), commitment, accessEventId: String(access.event.eventId) } });
  return { rows, commitment, mode };
}
