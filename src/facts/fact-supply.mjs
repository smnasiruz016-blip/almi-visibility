/**
 * F44 · VERIFIED FACT SUPPLY (acceptance _handoffs eecdfe4, RR-113). What every fact record carries, and what it lacks — counted, never
 * filled. Built under the owner's refinement (RR-111 §0): an empty population is reported empty, never passed.
 *
 *   C1  one product's registry; records the registry declares derived (registry.mjs isDerivedFact) are counted apart
 *   C2  nine recorded fields on every non-derived record, each PRESENT or ABSENT at its recorded path; one ABSENT disproves the field
 *   C3  unit: recorded or recorded-empty by value type — never judged (no authority says which facts need one)
 *   C4  derived records: source, tier, checker, check date and freshness waived ONLY for them; their derivation inputs counted
 *   C5  capability claims: admitted or refused by the EXISTING rules (capability-claims.mjs admitCapabilityClaim); none → COULD-NOT-PROVE
 *   C6  every count with its denominator; three verdicts
 * Pure: records in, counts out. Never fetches, re-checks or writes. Names no product.
 */
import { primaryFacts, derivedFacts } from "./registry.mjs";
import { isCapabilityClaim, SELF_SOURCED } from "./capability-claims.mjs";

export const VERDICT = Object.freeze({ PROVED: "PROVED", DISPROVED: "DISPROVED", COULD_NOT_PROVE: "COULD-NOT-PROVE" });
export const MISSING = Object.freeze({
  unitRule: "an owner declaration of which facts must carry a unit — none exists",
  noPrimary: "a non-derived fact record",
  noCapability: "a capability claim in the registry — none is recorded",
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
  const primary = primaryFacts(records);
  const derived = derivedFacts(records);
  const n = primary.length;
  const fields = Object.fromEntries(Object.entries(FIELDS).map(([name, has]) => {
    const present = primary.filter(has).length;
    return [name, { present, absent: n - present, denominator: n, verdict: fieldVerdict(n - present, n) }];
  }));
  const unitByType = {};
  for (const r of primary) {
    const t = r?.value?.valueType ?? "(no value type)";
    const k = text(r?.value?.unit) ? "recorded" : "recorded-empty";
    unitByType[t] = unitByType[t] ?? { recorded: 0, "recorded-empty": 0 };
    unitByType[t][k]++;
  }
  const unit = { byValueType: unitByType, denominator: n, missing: MISSING.unitRule, verdict: VERDICT.COULD_NOT_PROVE };
  const withDerivation = derived.filter((r) => Array.isArray(r?.derivation?.inputs) && r.derivation.inputs.length > 0);
  const derivedPart = {
    records: derived.length, withDerivation: withDerivation.length, inputs: withDerivation.reduce((s, r) => s + r.derivation.inputs.length, 0),
    waived: DERIVED_WAIVED, verdict: derived.length === 0 ? VERDICT.COULD_NOT_PROVE : withDerivation.length < derived.length ? VERDICT.DISPROVED : VERDICT.PROVED,
  };
  const caps = records.filter(isCapabilityClaim);
  const results = caps.map((c) => admit(c));
  const refusedBy = {};
  for (const r of results) for (const why of r.refusals) refusedBy[why] = (refusedBy[why] ?? 0) + 1;
  const admitted = results.filter((r) => r.admitted).map((r) => r.record);
  const selfSourced = admitted.filter((r) => r.source.class === SELF_SOURCED);
  const capability = {
    claims: caps.length, admitted: admitted.length, refused: caps.length - admitted.length, refusedBy,
    selfSourced: selfSourced.length, selfSourcedWithATier: selfSourced.filter((r) => r.source.tier !== null).length,
    selfSourcedVerified: selfSourced.filter((r) => r.verificationState === "VERIFIED").length,
    missing: caps.length === 0 ? MISSING.noCapability : null,
    verdict: caps.length === 0 ? VERDICT.COULD_NOT_PROVE : admitted.length < caps.length ? VERDICT.DISPROVED : VERDICT.PROVED,
  };
  const verdicts = [...Object.values(fields).map((f) => f.verdict), unit.verdict, derivedPart.verdict, capability.verdict];
  /* the unit is never judged (no declared rule), so no row can read PROVED — a branch for it would be unreachable */
  const verdict = verdicts.includes(VERDICT.DISPROVED) ? VERDICT.DISPROVED : VERDICT.COULD_NOT_PROVE;
  return { records: records.length, primary: n, fields, unit, derived: derivedPart, capability, verdict, missingPrimary: n === 0 ? MISSING.noPrimary : null };
}
