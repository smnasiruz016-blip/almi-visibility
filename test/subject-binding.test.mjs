/**
 * THE SUBJECT BINDING CONTRACT, V1 — the eight cases, and the envelope that cannot be bypassed.
 *
 * 🔴 TWO NEUTRAL FIXTURE TENANTS, AND NOTHING ELSE. `tenant-alpha` and `tenant-beta` share no
 * identifier, no host and no path. No client data appears here, and no Case Study locator: the
 * whole point of this contract is that it works without knowing whose data it is looking at.
 *
 * The eight cases are not eight nice-to-haves. Four of them (INVALID × 3, not-BOUND × 1) are the
 * ones that make the contract able to REFUSE, and a contract that cannot refuse is a schema.
 */
import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { subjectRef, refLabel, BINDING_STATES, SUBJECT_TYPES } from "../src/detect/subject.mjs";
import { evidenceEdge, bindSubject, effectiveOutcome, edgeFault, EDGE_TYPES } from "../src/detect/binding.mjs";
import { runDetectors, DETECTORS } from "../src/detect/run.mjs";
import { finding, clean, unknown, notApplicable } from "../src/detect/outcome.mjs";

/* F02: a tenant id is a DECLARED id of fixed shape — the one decision refuses any other shape as INVALID. */
const ALPHA = `tenant:${"a1".repeat(16)}`;
const BETA = `tenant:${"b2".repeat(16)}`;
const RUN_AT = "2026-09-20T00:00:00.000Z";

const page = (tenant, id) => subjectRef({ type: "PAGE", tenantId: tenant, identityKind: "CANONICAL_URL", identity: id, locator: id });
const artefact = (tenant, id) => subjectRef({ type: "SOURCE_ARTIFACT", tenantId: tenant, identityKind: "PATH_AT_COMMIT", identity: id, locator: id });
const edge = (tenant, from, to, over = {}) => evidenceEdge({
  from, to, edgeType: "BELONGS_TO_TENANT", tenantId: tenant,
  method: "declared by the run that captured it", artifact: "fixture capture record",
  reason: "the endpoint carries a stable identity and the run declares its tenant", ...over,
});

describe("🔴 THE EIGHT CASES", () => {
  test("1 · one lawful subject with an edge → BOUND", () => {
    const p = page(ALPHA, "https://alpha.invalid/a");
    const b = bindSubject({ tenantId: ALPHA, candidates: [p], edges: [edge(ALPHA, p, p)] });
    assert.equal(b.state, "BOUND");
    assert.equal(b.reason, "BOUND_SINGLE_LAWFUL_EDGE");
    assert.equal(refLabel(b.subject), `${ALPHA}:PAGE:https://alpha.invalid/a`);
    assert.equal(b.edges.length, 1);
  });

  test("2 · two lawful subjects → AMBIGUOUS, and BOTH are named", () => {
    const p1 = page(ALPHA, "https://alpha.invalid/a");
    const p2 = page(ALPHA, "https://alpha.invalid/b");
    const b = bindSubject({ tenantId: ALPHA, candidates: [p1, p2], edges: [edge(ALPHA, p1, p1)] });
    assert.equal(b.state, "AMBIGUOUS");
    assert.equal(b.subject, null, "ambiguity must never resolve itself by picking one");
    assert.deepEqual([...b.candidates].sort(), [refLabel(p1), refLabel(p2)].sort());
  });

  test("3 · a candidate with no edge → UNBOUND, and it stays visible", () => {
    const a = artefact(ALPHA, "some/path.ext");
    const b = bindSubject({ tenantId: ALPHA, candidates: [a], edges: [] });
    assert.equal(b.state, "UNBOUND");
    assert.equal(b.reason, "UNBOUND_NO_EDGE");
    assert.deepEqual(b.candidates, [refLabel(a)], "the candidate must not vanish because it did not bind");
  });

  test("4 · a missing tenant → INVALID, never an assumed tenant", () => {
    assert.equal(bindSubject({ candidates: [], edges: [] }).state, "INVALID");
    assert.equal(bindSubject({ tenantId: "", candidates: [], edges: [] }).reason, "INVALID_NO_TENANT");
    assert.throws(() => subjectRef({ type: "PAGE", identityKind: "CANONICAL_URL", identity: "x", locator: "x" }), /tenantId is required/);
  });

  test("5 · a cross-tenant edge → INVALID, not a weaker binding", () => {
    const pa = page(ALPHA, "https://alpha.invalid/a");
    const pb = page(BETA, "https://beta.invalid/b");
    const crossing = { ...edge(ALPHA, pa, pa), to: pb };
    const b = bindSubject({ tenantId: ALPHA, candidates: [pa], edges: [crossing] });
    assert.equal(b.state, "INVALID");
    assert.equal(b.reason, "INVALID_CROSS_TENANT");
    assert.equal(edgeFault(crossing), "INVALID_CROSS_TENANT");
  });

  test("6 · a fixture-to-real edge → INVALID (two tenants are two tenants, whatever they are called)", () => {
    const fixture = page("tenant-fixture", "https://fixture.invalid/x");
    const real = page(ALPHA, "https://alpha.invalid/a");
    const joined = { ...edge(ALPHA, real, real), from: fixture };
    assert.equal(edgeFault(joined), "INVALID_CROSS_TENANT");
    assert.equal(bindSubject({ tenantId: ALPHA, candidates: [real], edges: [joined] }).state, "INVALID");
    /* And a foreign CANDIDATE is refused even with no edge at all. */
    assert.equal(bindSubject({ tenantId: ALPHA, candidates: [fixture], edges: [] }).reason, "INVALID_CROSS_TENANT");
  });

  test("7 · the same wording or number, with no provenance, is NOT bound", () => {
    /* Two artefacts whose identities merely resemble each other. Nothing here is an edge, so the
     * binder must refuse — resemblance is the thing this contract exists to reject. */
    const a = artefact(ALPHA, "alpha/one/thing-42.ext");
    const lookalike = artefact(ALPHA, "alpha/two/thing-42.ext");
    const b = bindSubject({ tenantId: ALPHA, candidates: [a, lookalike], edges: [] });
    assert.notEqual(b.state, "BOUND", "matching text or numbers created a binding");
    assert.equal(b.state, "AMBIGUOUS");
    /* And one alone, still with no edge, is UNBOUND rather than bound by being the only one there. */
    assert.equal(bindSubject({ tenantId: ALPHA, candidates: [a], edges: [] }).state, "UNBOUND");
  });

  test("8 · removing the one required edge turns BOUND into UNBOUND", () => {
    const p = page(ALPHA, "https://alpha.invalid/a");
    assert.equal(bindSubject({ tenantId: ALPHA, candidates: [p], edges: [edge(ALPHA, p, p)] }).state, "BOUND");
    assert.equal(bindSubject({ tenantId: ALPHA, candidates: [p], edges: [] }).state, "UNBOUND");
  });
});

describe("🔴 the contract refuses malformed evidence at construction", () => {
  test("an edge outside the closed type list, or missing its method, artifact or reason, is refused", () => {
    const p = page(ALPHA, "x");
    assert.throws(() => evidenceEdge({ from: p, to: p, edgeType: "INVENTED_EDGE", tenantId: ALPHA, method: "m", artifact: "a", reason: "r" }), /V1 adds no edge types/);
    for (const missing of ["method", "artifact", "reason"]) {
      const args = { from: p, to: p, edgeType: "BELONGS_TO_TENANT", tenantId: ALPHA, method: "m", artifact: "a", reason: "r" };
      delete args[missing];
      assert.throws(() => evidenceEdge(args), new RegExp(missing));
    }
    assert.deepEqual([...EDGE_TYPES].sort(), [
      "BELONGS_TO_TENANT", "CLAIM_FROM_ARTIFACT", "CLAIM_PRODUCED_BY", "CLAIM_SUPPORTED_BY_FACT",
      "OBSERVATION_OF_PAGE", "PAGE_HAS_ROUTE", "RENDER_OF_OBSERVATION", "SITEMAP_ADVERTISES_PAGE",
    ].sort());
  });
  test("an identity kind that is mere resemblance is refused outright", () => {
    for (const kind of ["SIMILAR_TEXT", "SAME_NUMBER", "FILENAME_RESEMBLANCE", "DIRECTORY_PROXIMITY", "ARRAY_POSITION", "FIRST_MATCH"]) {
      assert.throws(() => subjectRef({ type: "PAGE", tenantId: ALPHA, identityKind: kind, identity: "x", locator: "x" }), /not a stable identity/);
    }
  });
  test("the four states and the nine types are exactly what V1 declares", () => {
    assert.deepEqual([...BINDING_STATES], ["BOUND", "AMBIGUOUS", "UNBOUND", "INVALID"]);
    assert.equal(SUBJECT_TYPES.length, 9, "V1 adds no subject types");
  });
});

describe("🔴 the effective outcome — what may actually leave the engine", () => {
  test("a FINDING leaves only on BOUND; otherwise it becomes an UNKNOWN coverage gap", () => {
    assert.deepEqual(effectiveOutcome("FINDING", "BOUND"), { outcome: "FINDING", reason: null });
    assert.deepEqual(effectiveOutcome("FINDING", "AMBIGUOUS"), { outcome: "UNKNOWN", reason: "COVERAGE_GAP_AMBIGUOUS" });
    assert.deepEqual(effectiveOutcome("FINDING", "UNBOUND"), { outcome: "UNKNOWN", reason: "COVERAGE_GAP_UNBOUND" });
    assert.deepEqual(effectiveOutcome("FINDING", "INVALID"), { outcome: "UNKNOWN", reason: "BINDING_INVALID" });
  });
  test("a CLEAN needs the same binding — an unbound CLEAN is not an evaluation", () => {
    assert.equal(effectiveOutcome("CLEAN", "BOUND").outcome, "CLEAN");
    for (const s of ["AMBIGUOUS", "UNBOUND", "INVALID"]) assert.equal(effectiveOutcome("CLEAN", s).outcome, "UNKNOWN");
  });
  test("UNKNOWN and NOT_APPLICABLE pass through — they are statements about the detector's reach", () => {
    for (const s of BINDING_STATES) {
      assert.equal(effectiveOutcome("UNKNOWN", s).outcome, "UNKNOWN");
      assert.equal(effectiveOutcome("NOT_APPLICABLE", s).outcome, "NOT_APPLICABLE");
    }
  });
});

describe("🔴 THE SHARED ENVELOPE — every A–F result, no bypass", () => {
  const bundle = {
    pageSubjects: ["https://alpha.invalid/p1"],
    claimProducer: { claims: [{ id: "https://alpha.invalid/p1", locator: "l", statedValues: ["x", "y", "z"] }], producers: [{ id: "P", locator: "lp", producedValues: ["x", "y"] }], bindings: { "https://alpha.invalid/p1": ["P"] } },
  };

  test("all six detectors return enveloped results, and none escapes without one", () => {
    const r = runDetectors({ bundle, runAt: RUN_AT, tenantId: ALPHA });
    assert.equal(r.detectors.length, DETECTORS.length, "a detector vanished from the run");
    assert.equal(r.tenantId, ALPHA);
    for (const d of r.detectors) {
      assert.ok(d.outcomes.length > 0, `${d.key} produced nothing`);
      for (const o of d.outcomes) {
        for (const field of ["detectorId", "detectorName", "detectorOutcome", "tenantId", "bindingState", "bindingReason"]) {
          assert.ok(field in o, `${d.key}/${o.subject}: the envelope is missing ${field}`);
        }
        assert.equal(o.detectorId, d.key);
        assert.ok(BINDING_STATES.includes(o.bindingState));
      }
    }
  });

  test("🔴 no actionable FINDING leaves with AMBIGUOUS, UNBOUND or INVALID", () => {
    for (const tenant of [ALPHA, null]) {
      const r = runDetectors({ bundle, runAt: RUN_AT, tenantId: tenant });
      for (const d of r.detectors) {
        for (const o of d.outcomes) {
          if (o.outcome === "FINDING" || o.outcome === "CLEAN") {
            assert.equal(o.bindingState, "BOUND", `${d.key}/${o.subject} left as ${o.outcome} on a ${o.bindingState} binding`);
          }
        }
      }
    }
  });

  test("🔴 a file path alone cannot become a page-level finding", () => {
    const b = {
      pageSubjects: ["https://alpha.invalid/p1"],
      claimProducer: { claims: [{ id: "some/file/path.ext", locator: "l", statedValues: ["x", "y", "z"] }], producers: [{ id: "P", locator: "lp", producedValues: ["x", "y"] }], bindings: { "some/file/path.ext": ["P"] } },
    };
    const a = runDetectors({ bundle: b, runAt: RUN_AT, tenantId: ALPHA }).detectors.find((d) => d.key === "A");
    const row = a.outcomes.find((o) => o.subject === "some/file/path.ext");
    assert.equal(row.detectorOutcome, "FINDING", "the detector still found what it found…");
    assert.equal(row.outcome, "UNKNOWN", "…and it must not leave as a finding about a page");
    assert.equal(row.bindingState, "UNBOUND");
    assert.equal(row.coverageReason, "COVERAGE_GAP_UNBOUND");
    assert.equal(row.primarySubject, null);
  });

  test("🔴 the detector's own verdict is preserved byte-equivalent inside the envelope when BOUND", () => {
    const r = runDetectors({ bundle, runAt: RUN_AT, tenantId: ALPHA });
    const row = r.detectors.find((d) => d.key === "A").outcomes.find((o) => o.subject === "https://alpha.invalid/p1");
    assert.equal(row.bindingState, "BOUND");
    assert.equal(row.outcome, "FINDING");
    assert.equal(row.detectorOutcome, "FINDING");
    assert.equal(row.defectClass, "claim-not-supported-by-producer");
    assert.ok(row.evidence.some((e) => e.includes("z")), "the original evidence must survive the wrapping unchanged");
    assert.equal(row.summary, "the surface states 1 value(s) the producing data or code never produces");
  });

  test("🔴 with no tenant declared, every envelope is INVALID and nothing actionable leaves", () => {
    const r = runDetectors({ bundle, runAt: RUN_AT });
    assert.equal(r.tenantId, null);
    const rows = r.detectors.flatMap((d) => d.outcomes);
    assert.equal(rows.every((o) => o.bindingState === "INVALID"), true, "a result bound without a tenant");
    assert.equal(rows.some((o) => o.outcome === "FINDING" || o.outcome === "CLEAN"), false);
  });

  test("🔴 one tenant's run never returns another tenant's subject", () => {
    const r = runDetectors({ bundle, runAt: RUN_AT, tenantId: BETA });
    for (const d of r.detectors) for (const o of d.outcomes) {
      assert.equal(o.tenantId, BETA);
      if (o.primarySubject) assert.ok(o.primarySubject.startsWith(`${BETA}:`), `a ${BETA} run surfaced ${o.primarySubject}`);
    }
  });
});
