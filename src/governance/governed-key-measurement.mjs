/**
 * 🔴 THE GOVERNED ROUTE FOR THE KEY READER (command 65d05e2 §3.1, E-D1-CENSUS-UNREGISTERED).
 *
 * src/heldout/key-registration.mjs measureKey is a MIXED writer — a sealed read plus audit events — so, like the scorer
 * (./governed-scoring.mjs), it is reached ONLY through the governed mutation boundary (./governed-write.mjs executeGovernedWrite).
 * This module lives beside the boundary for the same reason governed-scoring does: it only BUILDS the boundary's arguments.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { deriveIdempotencyKey } from "./governed-write.mjs";
import { measureKey, KEY_MODES } from "../heldout/key-registration.mjs";

/** The count-only record of each governed key measurement: its own top-level store, never under runs/. */
export const KEY_MEASUREMENT_STORE = "evaluation-releases/key-measurements.jsonl";

/**
 * 🔴 measureKey is a MIXED writer — it reads a sealed store and appends audit events — so it is reached ONLY through the governed
 * mutation boundary (executeGovernedWrite), exactly as the scorer is (../governance/governed-scoring.mjs). This builds the boundary's
 * arguments for ONE measurement: the named actor authorised first; prevalidation (a known mode, the key's store located) before any
 * attempt; a durable ATTEMPTED; the mutation = measureKey (G1–G3 above) plus ONE count-only record { key, mode, rows, commitment }
 * appended to KEY_MEASUREMENT_STORE; verification by inspection; COMMITTED. A refusal inside measureKey is recorded by it and fails
 * the write before commit — nothing is appended to the measurement store.
 */
export function governedKeyMeasurement({ repo, permission, audit, witness, trailLines, registry, stores, spec, mode, occurredAt }) {
  const fingerprint = createHash("sha256").update([spec?.keyId, mode, occurredAt].join("\n"), "utf8").digest("hex");
  const key = deriveIdempotencyKey({ profile: "VALIDATED_APPEND", targetClass: "RUN_EVIDENCE", repoRelativeTarget: KEY_MEASUREMENT_STORE, occurrenceFingerprint: fingerprint });
  const path = join(repo, KEY_MEASUREMENT_STORE);
  const records = () => (existsSync(path) ? readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) : []);
  let last = null;
  const adapter = {
    profile: "VALIDATED_APPEND",
    describeTarget: () => ({ targetClass: "RUN_EVIDENCE", repoRelativeTarget: KEY_MEASUREMENT_STORE }),
    inspect: (k) => { const hit = records().filter((r) => r.governedWriteKey === k); return hit.length === 0 ? { state: "ABSENT" } : hit.length === 1 ? { state: "COMMITTED" } : { state: "CONFLICTING", fields: "DUPLICATE_MEASUREMENT" }; },
    prevalidate: () => {
      const faults = [];
      if (!KEY_MODES.includes(mode)) faults.push({ code: "KEY_MODE_UNKNOWN" });
      if (!stores?.roots?.[spec?.root]) faults.push({ code: "SEALED_STORE_REQUIRED_BUT_UNLOCATED", why: String(spec?.root ?? "NONE") });
      return faults;
    },
    commit: () => {
      const r = measureKey({ audit, witness, trailLines, registry, stores, spec, mode, now: () => occurredAt });
      const record = { governedWriteKey: key, keyId: spec.keyId, linkedSet: spec.linkedSetId, mode, rows: r.rows, commitment: r.commitment, occurredAt, actor: String(permission?.actorRef ?? "UNNAMED") };
      if (records().some((x) => x.governedWriteKey === key)) throw Object.assign(new Error("a measurement for this run already exists"), { code: "MEASUREMENT_ALREADY_PRESENT" });
      mkdirSync(dirname(path), { recursive: true });
      appendFileSync(path, `${JSON.stringify(record)}\n`);
      last = record;
    },
    verify: (k) => (adapter.inspect(k).state === "COMMITTED" ? [] : [{ code: "MEASUREMENT_ABSENT" }]),
  };
  const action = { name: "RECORD_HELDOUT_EVALUATION", scopeType: "GLOBAL_PRODUCT", occurredAt, occurrenceFingerprint: fingerprint, evidenceRefs: [] };
  return Object.freeze({ permission, audit, adapter, action, idempotencyKey: key, result: () => last ?? records().find((x) => x.governedWriteKey === key) ?? null });
}
