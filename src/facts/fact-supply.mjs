/**
 * F44 · VERIFIED FACT SUPPLY (acceptance _handoffs eecdfe4, RR-113; ACCEPTANCE AMENDMENT 1, _handoffs 1fe07aa, RR-251). What every
 * record carries, and what it lacks — counted, never filled. Built under the owner's refinement (RR-111 §0): an empty population is
 * reported empty, never passed.
 *
 *   C1  one product's registry; records the registry declares derived (registry.mjs isDerivedFact) are counted apart
 *   C2  nine recorded fields on every record that is neither derived nor of kind capability, each PRESENT or ABSENT at its recorded
 *       path; one ABSENT disproves the field. A capability record is not among them — C5 judges it
 *   C3  unit: recorded or recorded-empty by value type. The owner's rule (RR-250 A1): a unit is required ONLY of money, duration and
 *       count. One such record without a unit DISPROVES; no such record → COULD-NOT-PROVE; any other value type is never judged
 *   C4  derived records: source, tier, checker, check date and freshness waived ONLY for them; their derivation inputs counted
 *   C5  capability records: each exists only as an owner-APPROVED answer of the product's client questionnaire, naming its committed
 *       approval record, and each is admitted or refused by the EXISTING rules (capability-claims.mjs); none → COULD-NOT-PROVE
 *   C6  every count with its denominator; three verdicts; the row is PROVED only when EVERY part is PROVED
 * Pure: records in, counts out. Never fetches, re-checks or writes. Names no product.
 */
import { isDerivedFact } from "./registry.mjs";
import { isCapabilityClaim, SELF_SOURCED } from "./capability-claims.mjs";
import { UNIT_REQUIRED_VALUE_TYPES, isOfAnApprovedAnswer } from "../questionnaire/product-questionnaire.mjs";

export const VERDICT = Object.freeze({ PROVED: "PROVED", DISPROVED: "DISPROVED", COULD_NOT_PROVE: "COULD-NOT-PROVE" });
export const MISSING = Object.freeze({
  noUnitRecord: "a record whose value type is money, duration or count — none is recorded",
  noPrimary: "a non-derived fact record",
  noCapability: "a capability record: an owner-approved answer of the product's client questionnaire — none is recorded",
});

const text = (v) => typeof v === "string" && v.trim() !== "";
/** C2: each field, read at its RECORDED path only. */
export const FIELDS = Object.freeze({
  /* the qualifier is RECORDED when its key exists: a null qualifier is the schema's declared "no qualifier" — an unqualified claim
   * (src/facts/schema.mjs, the claim key: subject.predicate, plus .qualifier only when one is recorded); a missing key is ABSENT */
  claim: (r) => text(r?.claim?.subject) && text(r?.claim?.predicate) && r?.claim !== null && typeof r?.claim === "object" && Object.hasOwn(r.claim, "qualifier"),
  value: (r) => r?.value !== null && typeof r?.value === "object" && r.value.value !== undefined,
  scope: (r) => text(r?.scope) || (r?.scope !== null && typeof r?.scope === "object"),
  source: (r) => text(r?.source?.url),
  tier: (r) => r?.source?.tier !== undefined && r?.source?.tier !== null,
  checker: (r) => text(r?.verification?.checkedBy),
  date: (r) => typeof r?.verification?.checkedOn === "string" && /^\d{4}-\d{2}-\d{2}/.test(r.verification.checkedOn),
  freshness: (r) => text(r?.freshness?.rule) && Number.isInteger(r?.freshness?.days),
  provenance: (r) => text(r?.provenance?.route),
});
/** C4: the fields a DERIVED record is excused from, and no others. */
export const DERIVED_WAIVED = Object.freeze(["source", "tier", "checker", "date", "freshness"]);

const fieldVerdict = (absent, n) => (n === 0 ? VERDICT.COULD_NOT_PROVE : absent > 0 ? VERDICT.DISPROVED : VERDICT.PROVED);

/** @param {object[]} records  one product's registry · @param {(c:object)=>{admitted:boolean, record:object|null, refusals:string[]}} admit  the existing admission, bound to its context */
export function auditFactSupply(records, { admit }) {
  const derived = records.filter(isDerivedFact);
  const caps = records.filter(isCapabilityClaim);
  const primary = records.filter((r) => !isDerivedFact(r) && !isCapabilityClaim(r));
  const n = primary.length;
  const fields = Object.fromEntries(Object.entries(FIELDS).map(([name, has]) => {
    const present = primary.filter(has).length;
    return [name, { present, absent: n - present, denominator: n, verdict: fieldVerdict(n - present, n) }];
  }));
  /* C3 — EACH record's unit, whatever its kind; judged only for the owner's three value types */
  const unitByType = {};
  let unitRequired = 0, unitRequiredAbsent = 0;
  for (const r of records) {
    const t = r?.value?.valueType ?? "(no value type)";
    const k = text(r?.value?.unit) ? "recorded" : "recorded-empty";
    unitByType[t] = unitByType[t] ?? { recorded: 0, "recorded-empty": 0 };
    unitByType[t][k]++;
    if (UNIT_REQUIRED_VALUE_TYPES.includes(t)) { unitRequired++; if (k === "recorded-empty") unitRequiredAbsent++; }
  }
  const unit = {
    byValueType: unitByType, denominator: records.length, requiredOf: UNIT_REQUIRED_VALUE_TYPES,
    required: unitRequired, requiredWithAUnit: unitRequired - unitRequiredAbsent, requiredWithoutAUnit: unitRequiredAbsent,
    missing: unitRequired === 0 ? MISSING.noUnitRecord : null,
    verdict: unitRequired === 0 ? VERDICT.COULD_NOT_PROVE : unitRequiredAbsent > 0 ? VERDICT.DISPROVED : VERDICT.PROVED,
  };
  const withDerivation = derived.filter((r) => Array.isArray(r?.derivation?.inputs) && r.derivation.inputs.length > 0);
  const derivedPart = {
    records: derived.length, withDerivation: withDerivation.length, inputs: withDerivation.reduce((s, r) => s + r.derivation.inputs.length, 0),
    waived: DERIVED_WAIVED, verdict: derived.length === 0 ? VERDICT.COULD_NOT_PROVE : withDerivation.length < derived.length ? VERDICT.DISPROVED : VERDICT.PROVED,
  };
  const results = caps.map((c) => admit(c));
  const refusedBy = {};
  for (const r of results) for (const why of r.refusals) refusedBy[why] = (refusedBy[why] ?? 0) + 1;
  const admitted = results.filter((r) => r.admitted).map((r) => r.record);
  const selfSourced = admitted.filter((r) => r.source.class === SELF_SOURCED);
  /* C5 — a capability record that is not an approved answer naming its committed record must not exist at all */
  const notOfAnApprovedAnswer = caps.filter((c) => !isOfAnApprovedAnswer(c)).length;
  const capability = {
    claims: caps.length, admitted: admitted.length, refused: caps.length - admitted.length, refusedBy,
    ofAnApprovedAnswer: caps.length - notOfAnApprovedAnswer, notOfAnApprovedAnswer,
    selfSourced: selfSourced.length, selfSourcedWithATier: selfSourced.filter((r) => r.source.tier !== null).length,
    selfSourcedVerified: selfSourced.filter((r) => r.verificationState === "VERIFIED").length,
    missing: caps.length === 0 ? MISSING.noCapability : null,
    verdict: caps.length === 0 ? VERDICT.COULD_NOT_PROVE : admitted.length < caps.length || notOfAnApprovedAnswer > 0 ? VERDICT.DISPROVED : VERDICT.PROVED,
  };
  const verdicts = [...Object.values(fields).map((f) => f.verdict), unit.verdict, derivedPart.verdict, capability.verdict];
  const verdict = verdicts.includes(VERDICT.DISPROVED) ? VERDICT.DISPROVED : verdicts.every((v) => v === VERDICT.PROVED) ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE;
  return { records: records.length, primary: n, fields, unit, derived: derivedPart, capability, verdict, missingPrimary: n === 0 ? MISSING.noPrimary : null };
}
