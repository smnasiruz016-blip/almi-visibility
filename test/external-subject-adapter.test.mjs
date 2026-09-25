/**
 * THE EXTERNAL SUBJECT ADAPTER — proved over the REAL external population, not fixtures.
 *
 * 🔴 WHY THIS FILE MATTERS MORE THAN ITS SIZE SUGGESTS. Every binding proof before it ran against
 * fixtures the run was handed directly — 144 of 144 BOUND, which proved almost nothing, because
 * handing a runner its own subjects is the easiest binding there is. These tests read a real
 * external subject through the engine's declared root and bind it on evidence that subject's own
 * material already carries.
 *
 * 🔴 AND NOTHING HERE NAMES A PRODUCT. The subject is resolved through `availableProducts()` and
 * selected as "the first declared EXTERNAL subject", so this file would read the same if a second
 * one were onboarded tomorrow. `test/product-boundary.test.mjs` enforces the same rule on `src/`.
 */
import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { readExternalSubject, toBundle, bindCitedClaim } from "../src/adapter/external-subject.mjs";
import { runDetectors } from "../src/detect/run.mjs";
import { subjectRef } from "../src/detect/subject.mjs";
import { evidenceEdge } from "../src/detect/binding.mjs";
import { subjectRoots } from "../src/subject-roots.mjs";
import { availableProducts, productFromArgvOrExit } from "../src/product-cli.mjs";

const RUN_AT = "2026-09-20T00:00:00.000Z";

/** The first product that resolves in an EXTERNAL root — chosen by kind, never by name. */
const externalRoots = subjectRoots(process.env).filter((r) => r.kind === "external").map((r) => r.path.replace(/\\/g, "/"));
const EXTERNAL_ID = availableProducts().find((id) => externalRoots.some((root) => {
  try { return existsSync(`${root}/${id}/product.mjs`); } catch { return false; }
}));

const PRODUCT = EXTERNAL_ID ? await productFromArgvOrExit(["node", "x", `--product=${EXTERNAL_ID}`], { usage: "adapter", scope: (await import("./support/subjects.mjs")).subjectScope(EXTERNAL_ID) }) : null;
const SUBJECT = PRODUCT ? await readExternalSubject({ product: PRODUCT }) : null;

describe("the external subject resolves through the declared root, and is real", () => {
  test("a declared EXTERNAL root exists and holds at least one subject", () => {
    assert.ok(externalRoots.length > 0, "no external subject root is declared");
    assert.ok(EXTERNAL_ID, "no product resolves in an external root — the adapter would have nothing real to read");
  });

  test("🔴 the material read lives OUTSIDE this repository", () => {
    const here = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1").replace(/\\/g, "/");
    assert.ok(!PRODUCT.factsDir.replace(/\\/g, "/").startsWith(here), `the subject's material is inside the engine: ${PRODUCT.factsDir}`);
  });

  test("P1 · the real population is non-empty, and its claims bind on INTRINSIC evidence", () => {
    assert.equal(SUBJECT.available, true, SUBJECT.reason ?? "");
    const p = SUBJECT.populations;
    assert.ok(p.records > 0, "the external registry is empty");
    assert.ok(p.pageSpecs > 0, "the subject declares no page spec, so it cites no claim");
    assert.ok(p.claimsCited > 0, "no claim is cited by anything — there would be no edge to derive");
    assert.ok(p.claimsResolved > 0, "🔴 not one cited claim resolved: no real binding exists");
    assert.equal(p.claimsCited, p.claimsResolved + p.claimsDangling + p.claimsAmbiguous, "the population does not account for itself");
  });

  test("P1 · and those bindings survive the runner's own judgement, ending BOUND", () => {
    const r = runDetectors({ bundle: toBundle(SUBJECT), runAt: RUN_AT, tenantId: SUBJECT.tenantId });
    const b = r.detectors.find((d) => d.key === "B").outcomes;
    const bound = b.filter((o) => o.bindingState === "BOUND");
    assert.ok(bound.length > 0, "no real subject reached BOUND through the shared integration point");
    for (const o of bound) {
      assert.equal(o.tenantId, SUBJECT.tenantId);
      assert.equal(o.primarySubjectType, "FACT_RECORD");
      assert.ok(o.evidenceEdges.length > 0, "a BOUND result carries no edge");
      assert.equal(o.evidenceEdges[0].edgeType, "CLAIM_SUPPORTED_BY_FACT");
    }
  });

  test("P7 · a FINDING or CLEAN leaves only on BOUND", () => {
    const r = runDetectors({ bundle: toBundle(SUBJECT), runAt: RUN_AT, tenantId: SUBJECT.tenantId });
    for (const d of r.detectors) for (const o of d.outcomes) {
      if (o.outcome === "FINDING" || o.outcome === "CLEAN") {
        assert.equal(o.bindingState, "BOUND", `${d.key}/${o.subject} left as ${o.outcome} on ${o.bindingState}`);
      }
    }
  });
});

describe("🔴 the adapter fails closed — proved on the real subject, not a fixture", () => {
  const oneBoundKey = () => Object.keys(SUBJECT.subjectBindings).find((k) => SUBJECT.subjectBindings[k].edges.length === 1);

  test("P2 · the same input with its binding edge REMOVED becomes UNBOUND / UNKNOWN", () => {
    const key = oneBoundKey();
    const bundle = toBundle(SUBJECT);
    bundle.subjectBindings = { ...bundle.subjectBindings, [key]: { ...bundle.subjectBindings[key], edges: [] } };
    const row = rowFor(bundle, key);
    assert.equal(row.bindingState, "UNBOUND");
    assert.notEqual(row.outcome, "FINDING");
    assert.notEqual(row.outcome, "CLEAN");
  });

  test("P3 · two competing lawful edges become AMBIGUOUS / UNKNOWN", () => {
    const key = oneBoundKey();
    const bundle = toBundle(SUBJECT);
    const base = bundle.subjectBindings[key];
    const second = subjectRef({ type: "FACT_RECORD", tenantId: SUBJECT.tenantId, identityKind: "FACT_ID", identity: `${base.candidates[0].identity}--competing`, locator: "a second lawful candidate" });
    bundle.subjectBindings = { ...bundle.subjectBindings, [key]: { candidates: [base.candidates[0], second], edges: base.edges } };
    const row = rowFor(bundle, key);
    assert.equal(row.bindingState, "AMBIGUOUS");
    assert.equal(row.outcome, "UNKNOWN");
    assert.equal(row.bindingCandidates.length, 2, "both candidates must be named, never chosen between");
  });

  test("P4 · a FORGED edge pointing at another subject is INVALID and can produce neither FINDING nor CLEAN", () => {
    const key = oneBoundKey();
    const bundle = toBundle(SUBJECT);
    const base = bundle.subjectBindings[key];
    const foreign = subjectRef({ type: "FACT_RECORD", tenantId: "some-other-subject", identityKind: "FACT_ID", identity: "forged", locator: "another subject entirely" });
    const forged = evidenceEdge({
      from: base.edges[0].from, to: foreign, edgeType: "CLAIM_SUPPORTED_BY_FACT", tenantId: SUBJECT.tenantId,
      method: "forged for this test", artifact: "none", reason: "a deliberately cross-subject edge",
    });
    bundle.subjectBindings = { ...bundle.subjectBindings, [key]: { candidates: base.candidates, edges: [forged] } };
    const row = rowFor(bundle, key);
    assert.equal(row.bindingState, "INVALID");
    assert.equal(row.bindingReason, "INVALID_CROSS_TENANT");
    assert.equal(row.outcome, "UNKNOWN");
    assert.equal(row.coverageReason, "BINDING_INVALID");
  });

  test("P5 · an unavailable external root is UNKNOWN, never an empty successful run", async () => {
    const gone = await readExternalSubject({ product: { ...PRODUCT, factsDir: "C:/definitely/not/a/real/root" } });
    assert.equal(gone.available, false);
    assert.equal(gone.reason, "ROOT_UNAVAILABLE");
    assert.equal(gone.registry.readable, false, "an unreadable root must never report a readable registry");
    /* And downstream it can produce nothing actionable. */
    const r = runDetectors({ bundle: toBundle(gone), runAt: RUN_AT, tenantId: gone.tenantId ?? "t" });
    for (const d of r.detectors) for (const o of d.outcomes) assert.notEqual(o.outcome, "CLEAN", `${d.key} reported CLEAN on an unavailable root`);
  });

  test("the adapter refuses an absent product rather than choosing one", async () => {
    const none = await readExternalSubject({});
    assert.equal(none.available, false);
    assert.equal(none.reason, "ROOT_UNAVAILABLE");
  });

  test("🔴 an EMPTY registry is not an available subject", async () => {
    const empty = await readExternalSubject({ product: { ...PRODUCT, factsDir: emptyFactsDir() } });
    assert.equal(empty.available, false);
    assert.equal(empty.reason, "NO_REGISTRY", "an empty directory must reach the empty-registry guard, not the unreadable one");
    assert.equal(empty.registry.readable, false);
  });

  test("🔴 a subject reported available has a registry that was ACTUALLY read", () => {
    assert.equal(SUBJECT.available, true);
    assert.equal(SUBJECT.registry.readable, true);
    assert.equal(SUBJECT.registry.records.length, SUBJECT.populations.records,
      "the registry claims to be read but carries a different number of records than were loaded");
    assert.ok(SUBJECT.registry.records.length > 0, "readable: true on an empty record set is a claim with nothing behind it");
  });
});

/**
 * 🔴 THE TWO BRANCHES THE REAL MATERIAL CANNOT REACH — driven directly, with crafted record sets.
 *
 * The subject's page specs resolve every claim they cite, and its registry keeps one active record
 * per claim, so DANGLING and AMBIGUOUS never occur on it today. A guard no input can reach is a
 * guard nobody has watched refuse. These records are invented here; none is client material.
 */
describe("🔴 every branch of the citation binder is reached, including the two real material cannot", () => {
  const T = "fixture-subject";
  const rec = (id) => ({ id, _file: "fixture.mjs", claim: { subject: "s", predicate: "p" }, value: { value: 1 } });

  test("RESOLVED · exactly one record carries the id → one candidate, one lawful edge", () => {
    const r = bindCitedClaim({ tenantId: T, slug: "s1", claimId: "a", records: [rec("a"), rec("b")] });
    assert.equal(r.kind, "RESOLVED");
    assert.equal(r.candidates.length, 1);
    assert.equal(r.edges.length, 1);
    assert.equal(r.edges[0].edgeType, "CLAIM_SUPPORTED_BY_FACT");
  });

  test("P2 · DANGLING · a citation naming an id nothing holds keeps the candidate VISIBLE with no edge", () => {
    const r = bindCitedClaim({ tenantId: T, slug: "s1", claimId: "missing", records: [rec("a")] });
    assert.equal(r.kind, "DANGLING");
    assert.equal(r.edges.length, 0, "an unresolvable citation must not acquire an edge");
    assert.equal(r.candidates.length, 1, "the candidate must not vanish because it did not resolve");
    /* And through the runner it is UNBOUND, so nothing actionable can leave on it. */
    const b = { pageSubjects: [], subjectBindings: { [r.claimSubject.identity]: { candidates: r.candidates, edges: r.edges } }, claimRegistry: { claims: [{ id: r.claimSubject.identity, locator: "l", authority: "s", predicate: "p", statedValue: 1 }], registry: { readable: true, records: [] } } };
    const row = runDetectors({ bundle: b, runAt: RUN_AT, tenantId: T }).detectors.flatMap((d) => d.outcomes).find((o) => o.subject === r.claimSubject.identity);
    assert.equal(row.bindingState, "UNBOUND");
    assert.notEqual(row.outcome, "FINDING");
  });

  test("P3 · AMBIGUOUS · two records claiming the id name BOTH and bind neither", () => {
    const r = bindCitedClaim({ tenantId: T, slug: "s1", claimId: "dup", records: [rec("dup"), rec("dup")] });
    assert.equal(r.kind, "AMBIGUOUS");
    assert.equal(r.candidates.length, 2, "both must be named, never chosen between");
    assert.equal(r.edges.length, 0, "an ambiguous citation must not acquire an edge");
  });
});

describe("🔴 P6 · nothing of the subject's material is written into this repository", () => {
  test("the working tree is clean of any external content, and the adapter persists nothing", () => {
    const status = execFileSync("git", ["status", "--porcelain"], { cwd: new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), encoding: "utf8" });
    const tracked = status.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("??"));
    /* Only engine sources may be modified by this work — never a data or content file. */
    /* 🔴 DELIBERATELY NARROW: only engine sources. A frozen boundary or acceptance document appearing
     * here would fail, which is what this command requires — none of them may be touched.
     *
     * 🔴 WIDENED 20 SEPTEMBER 2026, AND TIGHTENED WHERE IT MATTERS. The old rule was the single
     * prefix test (src|test|bin|config)/. Externalising the observation batch also had to change the
     * CI workflow and package.json, and had to DELETE three files under runs/ — none of which the old
     * rule could express, so it failed on the workflow file. What it actually protected is unchanged:
     * a frozen boundary, an acceptance document, a product file or any other evidence under runs/
     * still fails here. The replacement says so directly instead of by prefix, and is stricter about
     * runs/ than the old one was: only these three paths may go, and only as deletions. */
    /* 🔴 `tools/` ADDED 21 SEPTEMBER 2026. It was missing from the day this rule was written, and
     * nothing revealed it until a census under tools/ had to change. Everything there is engine
     * tooling — fourteen .mjs censuses and verifiers the tests import — so it belongs on the same
     * side of this line as src/ and test/, and none of what the rule guards moves by letting it in. */
    /* 🔴 F03 (25 Sep 2026): subject-package CODE (the owner's 24 Sep relocation put engine tooling at subjects/<id>/tools/ and
     * each package's declaration at subjects/<id>/package.mjs) is engine source like tools/ — code, never content. And the
     * fixtures root's REGISTRY (products/roots.json) is the one declaration F03 adds beside the neutral test products; it is
     * named exactly, so every product FILE under products/ stays guarded as before. */
    const ENGINE_SOURCE = /^(src|test|bin|config|tools|\.github)\/|^subjects\/[a-z0-9-]+\/(tools\/[^/]+\.mjs|package\.mjs)$/;
    /* F03: and the engine's own AUDIT TRAIL — appended only through the governed audit store, whose hash chain its own
     * verification tests check. Every governed write (a corpus migration, a crosswalk regeneration) appends to it, so a
     * pre-commit suite run on any such work saw it modified; it is engine state, never external content. */
    const ENGINE_FILES = new Set(["package.json", "products/roots.json", "audit-trail/events.jsonl", "audit-trail/head.json"]);
    const LAWFUL_DELETIONS = new Set([
      "runs/crawl/first-real-crawl-2026-09-12.jsonl",
      "runs/crawl/bodies-2026-09-12.jsonl.br",
      "runs/crawl/edges-2026-09-12.jsonl.br",
    ]);
    for (const line of tracked) {
      const code = line.slice(0, 2);
      const path = line.slice(3).trim();
      if (ENGINE_SOURCE.test(path) || ENGINE_FILES.has(path)) continue;
      assert.ok(
        code.includes("D") && LAWFUL_DELETIONS.has(path),
        `an unexpected file is modified: ${path} (${code.trim()})`,
      );
    }
  });
});

/** A real directory that holds no fact files — the engine's own empty-registry shape. */
function emptyFactsDir() {
  /* A genuinely EMPTY directory. `test/fixtures/` will not do — it holds .mjs files the registry
   * loader would try to import and reject, which lands in the UNREADABLE branch rather than the
   * empty one, and would leave the empty-registry guard unexercised. */
  return mkdtempSync(join(tmpdir(), "empty-facts-"));
}

function rowFor(bundle, key) {
  const r = runDetectors({ bundle, runAt: RUN_AT, tenantId: SUBJECT.tenantId });
  const row = r.detectors.flatMap((d) => d.outcomes).find((o) => o.subject === key);
  assert.ok(row, `no outcome for ${key}`);
  return row;
}
