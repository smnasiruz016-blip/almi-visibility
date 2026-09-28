/**
 * 🔴 F50 · THE QUESTION-FIT GATE — does the declared product ADDRESS a merged question, PARTIALLY address it, or NOT — or is
 * that UNKNOWN? Built BEFORE any such verdict is reported (RR-80 §3): "Until that path exists and passes, the only lawful
 * output is UNKNOWN."
 *
 *   Acceptance: _handoffs/AlmiVisibility_QUESTION_FIT_GATE_ACCEPTANCE_2026-09-28.md (ef4c6fc). NOT F50's row acceptance.
 *
 * G1 four outcomes · G2 every relied-on capability READ BACK in the request's own tenant and product as an admitted INDEPENDENT
 * VERIFIED claim, or the outcome is UNKNOWN · G3 PARTIALLY names both parts or is refused as INCOMPLETE · G4 decided from the
 * explicit links only — no wording is read, and a self-sourced claim never supports a state · G5 unmet needs kept, nothing
 * written · G6 the answer is never read · G7 the real population of usable capabilities is printed.
 *
 * It writes nothing and names no product, tenant, host or subject.
 */
import { admitCapabilityClaim, readCapabilityClaims, INDEPENDENT, MAX_CLAIMS_PER_CALL } from "./capability-claims.mjs";

export const FIT_STATES = Object.freeze(["ADDRESSES", "PARTIALLY_ADDRESSES", "DOES_NOT_ADDRESS", "UNKNOWN"]);
const DECIDED = new Set(["ADDRESSES", "PARTIALLY_ADDRESSES", "DOES_NOT_ADDRESS"]);
const nonEmpty = (v) => typeof v === "string" && v.trim() !== "";

/** The capability records this gate may rely on: read back in scope, re-admitted, INDEPENDENT and VERIFIED. */
function usableCapabilities(records, { resolve, productResourceOf, tenantId, productId }) {
  const read = readCapabilityClaims(records, { resolve, requestedTenantId: tenantId, productId });
  const usable = new Map();
  const why = new Map();
  for (const r of read.claims) {
    const a = admitCapabilityClaim(r, { resolve, productResourceOf });
    if (!a.admitted) { why.set(r.capabilityId, `NOT_ADMITTED:${a.refusals.join("+")}`); continue; }
    if (a.record.source.class !== INDEPENDENT) { why.set(r.capabilityId, "SELF_SOURCED"); continue; }
    if (a.record.verificationState !== "VERIFIED") { why.set(r.capabilityId, "NOT_VERIFIED"); continue; }
    usable.set(a.record.capabilityId, a.record);
  }
  return { usable, why, read };
}

/**
 * Decide one fit request. Returns { recorded: true, record } or { recorded: false, refused }. A refused request is never
 * recorded as any state; an undecidable one is recorded as UNKNOWN with its reason.
 */
export function decideFit(request, { records = [], resolve, productResourceOf }) {
  const { questionId, tenantId, productId, requestedState, addressedPart = null, unaddressedPart = null, capabilityIds = [], checker, date, reason } = request ?? {};
  if (!nonEmpty(questionId) || !nonEmpty(tenantId) || !nonEmpty(productId)) return { recorded: false, refused: "REQUEST_SCOPE_OR_QUESTION_ABSENT" };
  if (!FIT_STATES.includes(requestedState)) return { recorded: false, refused: "UNKNOWN_FIT_STATE" };
  if (!nonEmpty(checker) || !nonEmpty(date) || !nonEmpty(reason)) return { recorded: false, refused: "CHECKER_DATE_OR_REASON_ABSENT" };
  // ── G3 · a PARTIALLY without both parts is incomplete, and is recorded as nothing ──
  if (requestedState === "PARTIALLY_ADDRESSES" && !(nonEmpty(addressedPart) && nonEmpty(unaddressedPart))) return { recorded: false, refused: "INCOMPLETE_PARTIALLY" };

  const base = { questionId, tenantId, productId, checker, date, capabilityIds: [...capabilityIds] };
  const unknown = (why) => ({ recorded: true, record: Object.freeze({ ...base, outcome: "UNKNOWN", reason: `${reason} · UNKNOWN: ${why}`, addressedPart: null, unaddressedPart: null, unmet: null }) });
  if (requestedState === "UNKNOWN") return unknown("REQUESTED");

  // ── G2 · verified, independent, in-scope readback of EVERY relied-on capability, or UNKNOWN ──
  if (!Array.isArray(capabilityIds) || capabilityIds.length === 0) return unknown("NO_CAPABILITY_RELIED_ON");
  const { usable, why } = usableCapabilities(records, { resolve, productResourceOf, tenantId, productId });
  const failed = capabilityIds.filter((id) => !usable.has(id)).map((id) => `${id}=${why.get(id) ?? "NOT_READ_BACK_IN_SCOPE"}`);
  if (failed.length > 0) return unknown(failed.join(","));

  // ── G5 · the unmet part is kept with its reason; nothing is written anywhere ──
  const unmet = requestedState === "DOES_NOT_ADDRESS" ? reason : requestedState === "PARTIALLY_ADDRESSES" ? unaddressedPart : null;
  return {
    recorded: true,
    record: Object.freeze({
      ...base,
      outcome: requestedState,
      reason,
      addressedPart: requestedState === "PARTIALLY_ADDRESSES" ? addressedPart : null,
      unaddressedPart: requestedState === "PARTIALLY_ADDRESSES" ? unaddressedPart : null,
      unmet,
    }),
  };
}

/** G1 · a record with one of the three decided states. */
export const isDecided = (record) => DECIDED.has(record?.outcome);

/** G7 · how many capability claims could support a decided state, over a real population — printed with its bound. */
export function fitReadinessCensus(records, { resolve, productResourceOf }) {
  if (!Array.isArray(records)) throw new TypeError("a capability population must be an array");
  if (records.length > MAX_CLAIMS_PER_CALL) throw new RangeError(`POPULATION_OVER_BOUND: ${records.length} exceed ${MAX_CLAIMS_PER_CALL}`);
  let usable = 0;
  for (const r of records) {
    if (r?.kind !== "capability") continue;
    const a = admitCapabilityClaim(r, { resolve, productResourceOf });
    if (a.admitted && a.record.source.class === INDEPENDENT && a.record.verificationState === "VERIFIED") usable += 1;
  }
  return { usableVerifiedIndependent: usable, population: records.length, bound: MAX_CLAIMS_PER_CALL };
}
