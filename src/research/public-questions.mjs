/**
 * F16 · PUBLIC-QUESTION RESEARCH INTAKE (acceptance _handoffs 944f769, RR-114; owner direction RR-89 §1, 397e809).
 *
 * FINDS AND RECORDS ONLY — it never answers, never writes question-and-answer pairs, never produces page content, and never prints a
 * question's wording (the wording lives in the store; reports are count-only).
 *
 *   C2  every question carries source · surface · country · language · time window · collection method · declared limits; a field
 *       not captured is NOT MEASURED, named — never blank, never 0
 *   C3  three kinds, three lists, never merged: OBSERVED (seen asked) · INFERRED (our suggestion) · CLIENT_CLAIM (what the product or its
 *       owner says people ask — first-party, NOT evidence, RR-89 §1.2); a client claim never outranks an independent observation
 *   C4  originals survive: wording and provenance frozen as recorded; grouping only by an OWNER-DECLARED sameness rule — none → nothing
 *       grouped, the decision named; every original retrievable after grouping
 *   C5  every output is a SAMPLE with its declared limits; no completeness claim
 *   C7  result types, competitors, cited sources, features and answer formats: NOT MEASURED — they need observed result pages, and
 *       automated harvesting of result pages is not authorised (RR-89 §1.3)
 * Pure: records in, counts out. Names no product. Reads nothing sealed and nothing from a client's Search Console store.
 */
export const RECORD_TYPE = "public_question";
export const NOT_MEASURED = "NOT MEASURED";
export const VERDICT = Object.freeze({ PROVED: "PROVED", DISPROVED: "DISPROVED", COULD_NOT_PROVE: "COULD-NOT-PROVE" });
export const KINDS = Object.freeze({ OBSERVED: "OBSERVED", INFERRED: "INFERRED", CLIENT_CLAIM: "CLIENT_CLAIM" });
export const EVIDENCE_STATE = Object.freeze({
  OBSERVED: "OBSERVED — seen being asked, from an independent public source",
  INFERRED: "INFERRED — our suggestion or derivation, never an observation",
  CLIENT_CLAIM: "NOT EVIDENCE — the client's own first-party statement (RR-89 §1.2)",
});
export const REQUIRED_FIELDS = Object.freeze(["source", "surface", "country", "language", "timeWindow", "method", "limits"]);
export const CENSUS_PARTS = Object.freeze(["result types", "competitors", "cited sources", "features", "answer formats"]);
export const MISSING = Object.freeze({
  census: "recorded observations of result pages — none exists, and automated harvesting of result pages is not authorised (RR-89 §1.3)",
  sameness: "an owner-declared rule for when two questions are the same question",
  population: "a recorded public-question sample for this client — none exists",
});
/** C5: words and shapes that claim the whole world. A report line carrying any of them is refused. */
/** RR-117 §5: the marking every output derived from a TEST_PILOT batch carries with it. */
export const PILOT_MARK = "TEST / PILOT DATA";
export const COMPLETENESS_CLAIM = /\b(all|complete|completeness|full coverage|every question|exhaustive|entire|worldwide|comprehensive)\b/i;
/**
 * RR-125: WHO LOOKED. Every OBSERVED record carries exactly one observer type, and its `seenBy` label is derived from that type by this
 * one mapping — never chosen freely. A record whose label and type disagree (a relabelling, either way) is MALFORMED: it is never counted
 * as any observer type, least of all as a person. The types are equal bars — the same fields, the same reviewable reference — and record
 * only who looked.
 */
export const OBSERVER_TYPES = Object.freeze({
  PERSON_OBSERVED: "A PERSON — not the engine",
  AGENT_OBSERVED: "AN AGENT — not a person, and not the engine",
  SOURCE_ADAPTER_OBSERVED: "A SOURCE ADAPTER — the text as the source holds it",
});
export const NOT_AN_OBSERVATION = "NOT_AN_OBSERVATION";
/** A line that counts OBSERVED questions must show the split by observer type; a bare combined total is a false record. */
const OBSERVED_COUNT = /\bOBSERVED(:| \d)/;
export function assertObserverSplit(lines) {
  const bare = lines.filter((l) => OBSERVED_COUNT.test(l) && !Object.keys(OBSERVER_TYPES).every((t) => new RegExp(`\\b${t} \\d+`).test(l)));
  if (bare.length) throw Object.assign(new Error(`COMBINED_OBSERVED_COUNT_WITHOUT_SPLIT — ${bare.length} line(s) count OBSERVED without the split by observer type`), { code: "COMBINED_OBSERVED_COUNT_WITHOUT_SPLIT" });
  return lines;
}
/** The observer type of an OBSERVED record, or null when it is absent, unknown, or contradicted by its label. */
export function observerTypeOf(v) {
  const t = v?.provenance?.observerType;
  return Object.hasOwn(OBSERVER_TYPES, t) && v.provenance.seenBy === OBSERVER_TYPES[t] ? t : null;
}

const filled = (v) => (typeof v === "string" ? v.trim() !== "" : v !== null && v !== undefined && !(typeof v === "object" && Object.keys(v).length === 0));

/** C2/C3/C4: one recorded question, its fields NOT MEASURED where not captured, its original frozen. Returns null for a non-question. */
export function intakeOne(r) {
  if (r?.record_type !== RECORD_TYPE) return null;
  const v = r.value ?? {};
  /* RR-125: an OBSERVED record with no observer type, an unknown one, or a label that contradicts it is malformed — never counted */
  const observer = v.kind === KINDS.OBSERVED ? observerTypeOf(v) : NOT_AN_OBSERVATION;
  const kind = Object.hasOwn(KINDS, v.kind) && observer !== null ? v.kind : null;
  const fields = Object.fromEntries(REQUIRED_FIELDS.map((f) => [f, filled(v[f]) ? v[f] : NOT_MEASURED]));
  return Object.freeze({
    id: r.question_id ?? null,
    kind,
    observerType: kind === null ? null : observer,
    evidenceState: kind ? EVIDENCE_STATE[kind] : null,
    original: Object.freeze({ wording: v.original, provenance: Object.freeze({ ...(v.provenance ?? {}) }) }),
    fields: Object.freeze(fields),
    notMeasured: REQUIRED_FIELDS.filter((f) => fields[f] === NOT_MEASURED),
    dataPurpose: v.dataPurpose ?? null,
  });
}

/** C3: a client's own claim never outranks an independent observation; no other pair is ranked here. */
export function outranks(a, b) {
  if (a.kind === KINDS.OBSERVED && b.kind === KINDS.CLIENT_CLAIM) return true;
  if (a.kind === KINDS.CLIENT_CLAIM && b.kind === KINDS.OBSERVED) return false;
  return null;
}

/** C4: group equivalent questions ONLY by an owner-declared `sameAs(a, b)`; every group lists its members' ids, originals untouched. */
export function groupQuestions(questions, sameAs = null) {
  if (typeof sameAs !== "function") return { grouped: false, missing: MISSING.sameness, groups: questions.map((q) => Object.freeze([q.id])) };
  const groups = [];
  for (const q of questions) {
    const g = groups.find((members) => sameAs(questions.find((x) => x.id === members[0]), q));
    if (g) g.push(q.id); else groups.push([q.id]);
  }
  return { grouped: true, missing: null, groups: groups.map((g) => Object.freeze(g)) };
}

/** C4: every original, retrievable by id after grouping. */
export const originalsOf = (questions, groups) => groups.flat().map((id) => questions.find((q) => q.id === id)?.original ?? null);

export function intakeQuestions(records, { sameAs = null } = {}) {
  const all = records.map(intakeOne).filter(Boolean);
  const malformed = all.filter((q) => q.kind === null).length;
  const lists = Object.fromEntries(Object.keys(KINDS).map((k) => [k, all.filter((q) => q.kind === k)]));
  const grouping = Object.fromEntries(Object.keys(KINDS).map((k) => [k, groupQuestions(lists[k], sameAs)]));
  const fieldGaps = Object.fromEntries(REQUIRED_FIELDS.map((f) => [f, all.filter((q) => q.notMeasured.includes(f)).length]));
  const population = all.length;
  const pilot = all.filter((q) => q.dataPurpose === "TEST_PILOT").length;
  const observerSplit = Object.fromEntries(Object.keys(OBSERVER_TYPES).map((t) => [t, lists.OBSERVED.filter((q) => q.observerType === t).length]));
  const verdict = population === 0 ? VERDICT.COULD_NOT_PROVE : malformed > 0 ? VERDICT.DISPROVED : VERDICT.COULD_NOT_PROVE;
  return {
    population, malformed, lists, grouping, fieldGaps, pilot, observerSplit,
    census: Object.fromEntries(CENSUS_PARTS.map((p) => [p, NOT_MEASURED])),
    missing: [...(population === 0 ? [MISSING.population] : []), MISSING.census, ...(typeof sameAs === "function" ? [] : [MISSING.sameness])],
    verdict,
  };
}

/** C5/C6: the count-only report lines — a SAMPLE with its limits; never a wording, never an answer, never a completeness claim. */
export function reportLines(r, { limits }) {
  const lines = [
    `SAMPLE — not a census of the world's questions · declared limits: ${limits}`,
    ...(r.pilot > 0 ? [`${PILOT_MARK} — ${r.pilot} of ${r.population} record(s) come from a batch declared TEST_PILOT: not the demand of any country, not global demand, not a production client result`] : []),
    ...Object.keys(KINDS).map((k) => `${k}: ${r.lists[k].length} of ${r.population} recorded question(s)${k === KINDS.OBSERVED ? ` — by observer: ${Object.keys(OBSERVER_TYPES).map((o) => `${o} ${r.observerSplit[o]}`).join(" · ")}` : ""} · ${EVIDENCE_STATE[k]} · groups ${r.grouping[k].groups.length}${r.grouping[k].grouped ? "" : " (not grouped — missing " + MISSING.sameness + ")"}`),
    `fields not captured (NOT MEASURED): ${REQUIRED_FIELDS.map((f) => `${f} ${r.fieldGaps[f]} of ${r.population}`).join(" · ")}`,
    `census: ${CENSUS_PARTS.join(", ")} — NOT MEASURED — missing ${MISSING.census}`,
    `verdict ${r.verdict}${r.population === 0 ? " — the recorded sample is EMPTY, never a pass" : ""}`,
  ];
  const bad = lines.find((l) => COMPLETENESS_CLAIM.test(l));
  if (bad) throw new Error("COMPLETENESS_CLAIM_IN_OUTPUT: a report line claims more than a sample");
  /* C6: a question's wording lives in the store; a report line carrying any recorded wording is refused */
  const wordings = Object.values(r.lists).flat().map((q) => q.original.wording).filter((w) => typeof w === "string" && w.trim() !== "");
  if (lines.some((l) => wordings.some((w) => l.includes(w)))) throw new Error("QUESTION_WORDING_IN_OUTPUT: a report is count-only");
  return assertObserverSplit(lines);
}
