/**
 * 🔴 F08 · THE PRODUCTION WIRING — ONE PLACE WHERE THE REAL STORE IS BUILT (22 September 2026).
 *
 * Every production caller that appends an audit event builds its store HERE, so the store's path, its evidence-role
 * lookup, its sealed-path lookup and its protected-payload refusal are the same for all of them. Two callers wiring
 * their own would be two rules that drift.
 *
 * 🔴 IT FAILS CLOSED, EVERY TIME. If the protected-payload population cannot be derived, nothing is returned with an
 * empty list: the wiring throws, and the caller's governed action does not proceed. "I could not look" is never
 * "there is nothing there".
 */
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { AUDIT_STORE } from "../../config/audit-store.mjs";
import { EVIDENCE_ROLE_REGISTRY } from "../../config/evidence-roles.mjs";
import { createJsonlStore } from "../evidence/store.mjs";
import { queryObservation } from "../discovery/row5.mjs";
import { splitPopulation } from "../discovery/query-population.mjs";
import { isHeldOut } from "../discovery/intent-clusters.mjs";
import { createAuditStore } from "./store.mjs";
import { createAuditReader } from "./reader.mjs";
import { makeEvidenceLookup, makeSealedLookup } from "./population.mjs";

/**
 * The engine build that produced an event. A working tree with tracked modifications says so, because an event that
 * claims a clean commit it was not produced by is worse than one that admits it.
 */
export function softwareVersionOf(repo) {
  const git = (...a) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8" }).trim();
  const head = git("rev-parse", "HEAD");
  const dirty = git("status", "--porcelain").split("\n").some((l) => l.trim() !== "" && !l.startsWith("??"));
  return `engine:${head}${dirty ? "+dirty" : ""}`;
}

/**
 * 🔴 THE PROTECTED PAYLOAD THIS RUN MUST REFUSE, DERIVED AT RUNTIME AND NEVER LISTED ANYWHERE.
 * Same derivation the held-out firewall uses: the registry names the derivation, the evidence store supplies the rows.
 * Throws when it cannot be derived — the audit path then refuses to append at all.
 */
export function derivedForbiddenSubstrings(repo, registry = EVIDENCE_ROLE_REGISTRY) {
  const retired = registry.filter((e) => e.role === "RETIRED_CONTAMINATED" && e.resource?.derivation);
  if (retired.length === 0) return [];
  const store = createJsonlStore(join(repo, "runs", "evidence", "evidence.jsonl")).readAll();
  const out = [];
  for (const entry of retired) {
    const q = queryObservation(store, entry.resource.derivation.observationId);
    const rows = q?.value?.rows;
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error(`AUDIT_PAYLOAD_POPULATION_UNAVAILABLE: ${entry.id} could not be re-derived — the audit path refuses to append rather than append unchecked`);
    }
    for (const r of splitPopulation(rows).human) if (isHeldOut(r.query)) out.push(String(r.query));
  }
  return out;
}

/** The production store, at the declared path, wired to the production registry. */
export function productionAuditStore({ repo, clock, forbiddenSubstrings = null, registry = EVIDENCE_ROLE_REGISTRY }) {
  return createAuditStore({
    eventsPath: join(repo, AUDIT_STORE.eventsPath),
    headPath: join(repo, AUDIT_STORE.headPath),
    clock,
    evidenceEntryFor: makeEvidenceLookup(registry),
    isSealedRef: makeSealedLookup(registry),
    forbiddenSubstrings: forbiddenSubstrings ?? derivedForbiddenSubstrings(repo, registry),
    sizeCeilingBytes: AUDIT_STORE.sizeCeilingBytes,
  });
}

/** The production reader over that store, with F05's real corpus for the three authority values. */
export function productionAuditReader({ repo, authorityRecords, now, registry = EVIDENCE_ROLE_REGISTRY, store = null }) {
  return createAuditReader({
    store: store ?? productionAuditStore({ repo, forbiddenSubstrings: [] }),
    authorityRecords,
    now,
    evidenceEntryFor: makeEvidenceLookup(registry),
  });
}
