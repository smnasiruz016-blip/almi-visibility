/**
 * 🔴 REAL OBSERVED PAGES REACHING SUBJECT BINDING V1.
 *
 * V1 reported 144/144 on fixtures it was handed and 28/28 on exact id matches inside one registry
 * file. Neither touched what the sealed run actually failed at: binding a real URL to the bytes
 * really served for it. This file holds that binding to the same standard as everything else —
 * every page accounted for, every refusal observed, and the branches the real material cannot reach
 * driven directly rather than reported as proved.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

import {
  observedPageSubjects, judgeObservedPage, normaliseObservedUrl, toBundle, bundlesByTenant, pageOriginRef, PAGE_REASONS,
} from "../src/adapter/observed-page-subject.mjs";
import { createTenantResolver, TENANT_ID_PATTERN } from "../src/tenancy/resolver.mjs";
import { ObservationBatchFault, BATCH_FAULTS, BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { runDetectors } from "../src/detect/run.mjs";
import { effectiveOutcome } from "../src/detect/binding.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");

/** The real run, computed once. */
const REAL = observedPageSubjects();

/* ================================================================== *
 * THE TENANT — B2's question, enforced in code
 * ================================================================== */

/**
 * 🔴 WHAT THE TWO TESTS REPLACED HERE USED TO CATCH, AND WHERE IT WENT.
 *
 * They asserted that the tenant WAS the capture batch (`observation-batch:<batchId>`), that it never
 * named a product, and that `batchTenantId` threw on a missing batchId or an already-ASSIGNED batch.
 *
 * Two of those three properties are now stronger, not weaker, and are re-proved below: the tenant
 * still never names a product — it cannot, being an opaque declared identifier — and an identity the
 * engine cannot establish still refuses rather than defaulting, now per page rather than per batch.
 *
 * 🔴 WHAT IS GENUINELY LOST, STATED PLAINLY: the ASSIGNED-batch refusal. `batchTenantId` enforced
 * "an assigned batch has an owner and this adapter must not overwrite one". There is no longer
 * anything to overwrite, because the batch is not a scope in the first place — the manifest's
 * classificationState is now provenance that nothing reads as authority. The property did not move
 * somewhere else; it stopped being meaningful. It is recorded here rather than quietly dropped.
 */
test("🔴 the tenant of an observed page is DECLARED — never the batch, never a product", () => {
  assert.equal(REAL.classificationState, "UNASSIGNED", "the batch's own state is still carried as provenance");

  const tenants = REAL.tenants;
  assert.ok(tenants.length > 1, `expected the population to span several declared scopes, got ${tenants.length}`);

  for (const t of tenants) {
    /* Opaque and declared: it cannot encode a product, a host or a batch, because it is 32 hex
     * characters that were assigned once and mean nothing on their own. */
    assert.match(t, TENANT_ID_PATTERN, `${t} is not a declared opaque identifier`);
    assert.doesNotMatch(t, /almi/i, "the tenant names a product");
    assert.ok(!t.includes(REAL.batchId), "the tenant is derived from the capture batch");
    assert.doesNotMatch(t, /^observation-batch:/, "the tenant is still the batch — the superseded mechanism");
  }

  /* Every page that has a scope got it from a declaration, and the resolution is accounted for. */
  const resolvedPages = REAL.pages.filter((p) => p.tenantId).length;
  assert.equal(REAL.resolution.RESOLVED, resolvedPages, "a page carries a tenant the resolver did not resolve");
  assert.equal(Object.values(REAL.resolution).reduce((a, b) => a + b, 0), REAL.population);
});

test("🔴 an UNDECLARED origin gets no tenant and no binding — never a neighbour's, never the batch's", () => {
  /* A resolver over declarations that exist but attach nothing: every page must refuse. */
  const declaresNothing = () => ({ state: "UNDECLARED", tenantId: null, reason: "NO_ATTACHMENT", detail: "test" });
  const none = observedPageSubjects({ resolveTenant: declaresNothing });

  assert.equal(none.population, REAL.population, "the population changed when nothing was declared");
  assert.equal(none.counts.BOUND, 0, "a page bound without a declared scope");
  assert.equal(none.counts.UNBOUND, none.population, "every page must stay visible and refuse");
  assert.equal(none.resolution.UNDECLARED, none.population);
  for (const p of none.pages) {
    assert.equal(p.tenantId, null, `${p.pageId} was given a tenant nobody declared`);
    assert.equal(p.reason, "TENANT_UNDECLARED");
  }
  /* And nothing is offered to a runner, so no fallback can bind it downstream. */
  assert.equal(bundlesByTenant(none).length, 0, "an undeclared page was offered to the runner anyway");

  /* CONTROL: the same call with the real declarations binds — so the refusal above is not a
   * function that refuses everything. */
  assert.equal(REAL.counts.BOUND, 389, "the control arm did not bind, so the refusal proves nothing");
});

test("🔴 each of the four non-RESOLVED states fails closed, each driven by a real resolver answer", () => {
  const cases = [
    ["UNDECLARED", "UNBOUND", "TENANT_UNDECLARED"],
    ["AMBIGUOUS", "AMBIGUOUS", "TENANT_AMBIGUOUS"],
    ["INVALID", "INVALID", "TENANT_INVALID"],
    ["UNKNOWN", "UNBOUND", "TENANT_SOURCE_UNKNOWN"],
  ];
  for (const [resolverState, pageState, reason] of cases) {
    const r = observedPageSubjects({ resolveTenant: () => ({ state: resolverState, tenantId: null, reason: "x", detail: "driven by a real resolver answer" }) });
    assert.equal(r.counts[pageState], r.population, `${resolverState} did not put every page in ${pageState}`);
    assert.equal(r.counts.BOUND, 0, `${resolverState} produced a binding`);
    assert.ok(r.pages.every((p) => p.reason === reason), `${resolverState} did not record ${reason}`);
    assert.ok(r.pages.every((p) => p.url), "a page lost its URL and therefore its visibility");
  }
});

test("🔴 the origin reference a page resolves by is its canonical origin, and nothing else", () => {
  const ref = pageOriginRef("https://Example.test:8443/a/b?q=1#frag");
  assert.deepEqual(ref, { resourceKind: "SITE_ORIGIN", resourceRef: "https://example.test:8443" });
  /* The path, the query and the fragment are not part of a site's identity; the port and scheme are. */
  assert.equal(pageOriginRef("http://example.test/x").resourceRef, "http://example.test");
  assert.notEqual(pageOriginRef("http://example.test/x").resourceRef, pageOriginRef("https://example.test/x").resourceRef);
});

/* ================================================================== *
 * P13 · THE ARITHMETIC CLOSES
 * ================================================================== */

test("🔴 P13 · every page is in exactly one bucket and the buckets sum to the population", () => {
  const sum = Object.values(REAL.counts).reduce((a, b) => a + b, 0);
  assert.equal(sum, REAL.population, `buckets sum to ${sum}, population is ${REAL.population}`);
  assert.equal(REAL.pages.length, REAL.population, "a page went missing from the output");
  assert.equal(REAL.population, 495, "the page population is not the one this test was written for");
  /* Each page carries exactly one state and one reason — no page is double-counted. */
  for (const p of REAL.pages) {
    assert.ok(["BOUND", "AMBIGUOUS", "UNBOUND", "INVALID"].includes(p.state), `${p.pageId}: ${p.state}`);
    assert.ok(typeof p.reason === "string" && p.reason.trim() !== "", `${p.pageId} has no reason`);
  }
});

test("🔴 an UNBOUND page stays VISIBLE, with its reason — never filtered out of the counts", () => {
  const unbound = REAL.pages.filter((p) => p.state === "UNBOUND");
  assert.equal(unbound.length, REAL.counts.UNBOUND);
  assert.ok(unbound.length > 0, "there is no unbound page to check, so this assertion proves nothing");
  for (const p of unbound) {
    assert.ok(p.url, "an unbound page lost its URL");
    assert.ok(p.reason in PAGE_REASONS, `${p.reason} is not a declared reason`);
  }
  assert.equal(unbound.length, 106, "the bodiless population is not the one measured");
});

/* ================================================================== *
 * P1 · A REAL PAGE BINDS THROUGH AN EXACT IDENTIFIER CHAIN
 * ================================================================== */

test("🔴 P1 · real pages become BOUND through page.observations -> observation_id -> body, hash-verified", () => {
  const bound = REAL.pages.filter((p) => p.state === "BOUND");
  assert.equal(bound.length, REAL.counts.BOUND);
  assert.equal(bound.length, 389, "the bound population is not the one measured");
  for (const p of bound) {
    assert.equal(p.distinctContents, 1, `${p.url}: BOUND with ${p.distinctContents} distinct contents`);
    assert.equal(p.binding.state, "BOUND");
    assert.equal(p.binding.reason, "BOUND_SINGLE_LAWFUL_EDGE");
    /* The scope is now the page's OWN declared one, resolved from its origin — so the assertion is
     * per page rather than per run. That is the substantive change: 389 pages that once shared one
     * scope now sit in the scopes their origins are declared in. */
    assert.match(p.tenantId, TENANT_ID_PATTERN, `${p.pageId} carries a tenant that is not a declared identifier`);
    assert.ok(p.subject.startsWith(`${p.tenantId}:PAGE:`), `${p.subject} is not a page subject of its own tenant`);
    assert.equal(p.edges.length, 1);
    assert.equal(p.edges[0].edgeType, "OBSERVATION_OF_PAGE");
    assert.equal(p.edges[0].tenantId, p.tenantId);
    /* And the page's scope is the one its origin resolves to — not a neighbour's. */
    assert.equal(p.tenantId, createTenantResolver({})(pageOriginRef(p.url)).tenantId);
  }
});

test("🔴 the five pages fetched twice are BOUND, not AMBIGUOUS — identical bytes are one candidate", () => {
  const twoBodies = REAL.pages.filter((p) => p.bodyIds.length > 1);
  assert.equal(twoBodies.length, 5, "the double-fetched population is not the one measured");
  for (const p of twoBodies) {
    assert.equal(p.distinctContents, 1, "two DIFFERENT bodies would be a real ambiguity");
    assert.equal(p.state, "BOUND");
  }
  /* And the arithmetic that follows from it: 389 bound pages carry 394 bodies. */
  assert.equal(REAL.pages.reduce((n, p) => n + p.bodyIds.length, 0), 394);
});

/* ================================================================== *
 * THE BRANCHES THE REAL MATERIAL CANNOT REACH — driven directly
 * ================================================================== */

const T = "observation-batch:test";
const LOC = "observations/test/run.jsonl";
const obsRec = (id, ref, body) => ({ record_type: "observation", observation_id: id, target: { kind: "url", ref }, content_sha256: sha256(body) });

/** Build the inputs judgeObservedPage takes, from crafted records. */
function craft({ url, observations = [], bodies = [], sharedUrlIds = null }) {
  const obsMap = new Map(observations.map((o) => [o.observation_id, o]));
  const bodyMap = new Map(bodies);
  const idsByUrl = new Map();
  let normalised = null;
  try { normalised = normaliseObservedUrl(url); } catch { /* deliberately malformed */ }
  if (normalised) idsByUrl.set(normalised, sharedUrlIds ?? new Set(["p1"]));
  return {
    page: { record_type: "page", page_id: "p1", canonical_url: url, observations: observations.map((o) => o.observation_id) },
    tenantId: T, locator: LOC, batchId: "test", observations: obsMap, bodies: bodyMap, idsByUrl,
  };
}

test("🔴 CONTROL: the crafted harness CAN produce a BOUND page — otherwise every refusal below is vacuous", () => {
  const body = "<html>a</html>";
  const r = judgeObservedPage(craft({
    url: "https://host.example/a",
    observations: [obsRec("o1", "https://host.example/a", body)],
    bodies: [["o1", body]],
  }));
  assert.equal(r.state, "BOUND", `the harness cannot reach BOUND: ${r.reason}`);
  assert.equal(r.reason, "UNIQUE_EXACT_JOIN");
});

test("🔴 P2 · removing the body edge produces UNBOUND — and UNKNOWN downstream", () => {
  const r = judgeObservedPage(craft({
    url: "https://host.example/a",
    observations: [obsRec("o1", "https://host.example/a", "<html>a</html>")],
    bodies: [],
  }));
  assert.equal(r.state, "UNBOUND");
  assert.equal(r.reason, "NO_BODY");
  assert.equal(effectiveOutcome("FINDING", r.state).outcome, "UNKNOWN");
  assert.equal(effectiveOutcome("CLEAN", r.state).outcome, "UNKNOWN");

  /* And a page naming no observation this batch holds. */
  const noObs = judgeObservedPage(craft({ url: "https://host.example/a", observations: [] }));
  assert.equal(noObs.state, "UNBOUND");
  assert.equal(noObs.reason, "NO_OBSERVATION");
});

test("🔴 P3 · two DIFFERENT bodies for one URL produce AMBIGUOUS, and both candidates are named", () => {
  const a = "<html>a</html>", b = "<html>DIFFERENT</html>";
  const r = judgeObservedPage(craft({
    url: "https://host.example/a",
    observations: [obsRec("o1", "https://host.example/a", a), obsRec("o2", "https://host.example/a", b)],
    bodies: [["o1", a], ["o2", b]],
  }));
  assert.equal(r.state, "AMBIGUOUS");
  assert.equal(r.reason, "MULTIPLE_DISTINCT_BODIES");
  assert.equal(r.distinctContents, 2);
  assert.equal(r.candidates.length, 2, "both candidates must be named, never chosen between");
  assert.equal(effectiveOutcome("FINDING", r.state).outcome, "UNKNOWN");

  /* CONTROL: the SAME bytes twice is not an ambiguity. */
  const same = judgeObservedPage(craft({
    url: "https://host.example/a",
    observations: [obsRec("o1", "https://host.example/a", a), obsRec("o2", "https://host.example/a", a)],
    bodies: [["o1", a], ["o2", a]],
  }));
  assert.equal(same.state, "BOUND");
  assert.equal(same.distinctContents, 1);
});

test("🔴 P4 · an observation targeting another host produces INVALID", () => {
  const body = "<html>a</html>";
  const r = judgeObservedPage(craft({
    url: "https://host.example/a",
    observations: [obsRec("o1", "https://OTHER-host.example/a", body)],
    bodies: [["o1", body]],
  }));
  assert.equal(r.state, "INVALID");
  assert.equal(r.reason, "CROSS_HOST_EDGE");
  assert.equal(effectiveOutcome("FINDING", r.state).outcome, "UNKNOWN");
});

test("🔴 P4b · a body that does not hash to its observation's record produces INVALID, not merely unbound", () => {
  const r = judgeObservedPage(craft({
    url: "https://host.example/a",
    observations: [obsRec("o1", "https://host.example/a", "<html>recorded</html>")],
    bodies: [["o1", "<html>SUBSTITUTED</html>"]],
  }));
  assert.equal(r.state, "INVALID");
  assert.equal(r.reason, "BODY_HASH_MISMATCH");
});

test("🔴 P5 · a malformed URL, and a URL claimed by two page ids, each produce INVALID", () => {
  const malformed = judgeObservedPage(craft({ url: "not a url", observations: [] }));
  assert.equal(malformed.state, "INVALID");
  assert.equal(malformed.reason, "MALFORMED_URL");

  const ftp = judgeObservedPage(craft({ url: "ftp://host.example/a", observations: [] }));
  assert.equal(ftp.state, "INVALID", "a non-web protocol is not an observable page");

  const body = "<html>a</html>";
  const contradictory = judgeObservedPage(craft({
    url: "https://host.example/a",
    observations: [obsRec("o1", "https://host.example/a", body)],
    bodies: [["o1", body]],
    sharedUrlIds: new Set(["p1", "p2"]),
  }));
  assert.equal(contradictory.state, "INVALID");
  assert.equal(contradictory.reason, "CONTRADICTORY_IDENTITY");
});

test("🔴 URL normalisation never changes which resource is meant", () => {
  assert.equal(normaliseObservedUrl("https://HOST.example/a/"), "https://host.example/a");
  assert.equal(normaliseObservedUrl("https://host.example/a#frag"), "https://host.example/a");
  assert.equal(normaliseObservedUrl("https://host.example/"), "https://host.example/", "the root slash is not a trailing slash");
  /* A query string distinguishes a resource and is never stripped. */
  assert.notEqual(normaliseObservedUrl("https://host.example/a?x=1"), normaliseObservedUrl("https://host.example/a"));
  assert.throws(() => normaliseObservedUrl(""), /required/);
  assert.throws(() => normaliseObservedUrl("ftp://host.example/a"), /not an observable/);
});

/* ================================================================== *
 * P6 · THE ROOT
 * ================================================================== */

test("🔴 P6 · an unreadable external root produces UNKNOWN, never an empty successful population", () => {
  const env = { ALMIVISIBILITY_SUBJECT_ROOTS: `${REPO}.test-scratch/no-such-root` };
  let threw = null;
  try { const r = observedPageSubjects({ env }); assert.fail(`returned ${r.population} pages instead of refusing`); }
  catch (e) { threw = e; }
  assert.ok(threw instanceof ObservationBatchFault, `threw ${threw?.name}, not a named batch fault`);
  assert.equal(threw.fault, BATCH_FAULTS.UNAVAILABLE);
});

/* ================================================================== *
 * P7 / P8 · THE SHARED A–F INTEGRATION POINT
 * ================================================================== */

test("🔴 P7 · bound pages reach the shared A–F integration point and are RE-JUDGED there as BOUND", () => {
  /* 🔴 ONE RUN PER DECLARED SCOPE — and the reason is measured two tests below. The bundle spans
   * many scopes now, and runDetectors takes one; handing it the whole population under a single
   * scope is exactly the mistake this loop exists to prevent. */
  const groups = bundlesByTenant(REAL);
  assert.ok(groups.length > 1, `expected several declared scopes, got ${groups.length}`);
  assert.equal(groups.reduce((n, g) => n + g.bundle.pageSubjects.length, 0), 495, "a page did not reach any bundle");

  const rows = [];
  const states = {};
  for (const g of groups) {
    const result = runDetectors({ bundle: g.bundle, runAt: "2026-09-20T12:00:00Z", tenantId: g.tenantId });
    assert.equal(result.tenantId, g.tenantId);
    assert.equal(result.detectors.length, 6, "the six A–F comparators did not all run");
    for (const r of result.detectors.flatMap((d) => d.outcomes)) {
      rows.push(r);
      states[r.bindingState] = (states[r.bindingState] ?? 0) + 1;
    }
  }
  assert.ok(rows.length > 0, "the runs produced no outcomes at all");
  /* Every page is seen by every comparator, plus one input-level outcome per comparator per run. */
  assert.equal(rows.length, 6 * (495 + groups.length), `the comparators saw ${rows.length} subjects, not every page`);

  /* 🔴 THE RE-JUDGEMENT IS THE POINT. This adapter OFFERED a binding per page; runDetectors ran
   * bindSubject over the candidates and edges again. The states below are its verdict, not ours. */
  assert.ok((states.BOUND ?? 0) >= 389, `the runner bound ${states.BOUND ?? 0} subjects, expected at least the 389 this adapter offered: ${JSON.stringify(states)}`);
  assert.equal(states.INVALID ?? 0, 0, `the runner found ${states.INVALID} invalid bindings among real pages`);

  /* And a page the adapter could not bind is not bound by the runner either. */
  const unboundUrl = REAL.pages.find((p) => p.state === "UNBOUND").url;
  const forUnbound = rows.filter((r) => r.subject === unboundUrl);
  assert.ok(forUnbound.length > 0, "the unbound page never reached the runner");
  for (const r of forUnbound) assert.notEqual(r.bindingState, "BOUND", "a page with no body bound anyway");
});

test("🔴 REGRESSION: an UNBOUND page offered to the runner is NOT re-bound by the runner's own fallback", () => {
  /* The first version of toBundle listed every page in pageSubjects and supplied a binding only for
   * the bound ones. runDetectors, given a page subject with no supplied binding, builds a
   * BELONGS_TO_TENANT edge from the page's mere presence in the bundle and binds it — so all 106
   * bodiless pages came back BOUND and could have carried a page-level finding. Every page offered
   * now carries an explicit binding, and this holds that. */
  const bundle = toBundle(REAL);
  for (const url of bundle.pageSubjects) {
    assert.ok(bundle.subjectBindings[url], `${url} is offered as a subject with no explicit binding`);
  }
  const unbound = REAL.pages.filter((p) => p.state === "UNBOUND");
  for (const p of unbound) {
    const supplied = bundle.subjectBindings[p.url];
    assert.ok(supplied, "an unbound page vanished from the bundle instead of staying visible");
    assert.equal(supplied.edges.length, 0, "an unbound page was given an edge");
    assert.equal(supplied.candidates.length, 1, "an unbound page lost its candidate, which would read as INVALID rather than UNBOUND");
  }
});

test("🔴 an INVALID page is never offered as a page subject, and never disappears from the result", () => {
  /* Crafted, because the real material has no INVALID page. */
  const body = "<html>a</html>";
  const invalid = judgeObservedPage(craft({
    url: "https://host.example/a",
    observations: [obsRec("o1", "https://elsewhere.example/a", body)],
    bodies: [["o1", body]],
  }));
  assert.equal(invalid.state, "INVALID");
  const bundle = toBundle({ pages: [invalid] });
  assert.deepEqual(bundle.pageSubjects, [], "an INVALID page was offered as a subject, where it would read as UNBOUND");
  assert.deepEqual(Object.keys(bundle.subjectBindings), []);
  /* Still present, still counted, still carrying its reason. */
  assert.equal(invalid.reason, "CROSS_HOST_EDGE");
  assert.ok(invalid.url, "an INVALID page lost its URL and could not be reported at all");

  /* 🔴 THE STATE CHECK IS DEFENCE IN DEPTH, AND IT IS DRIVEN DIRECTLY.
   *
   * Today every INVALID return also sets pageSubject to null, so the earlier `!p.pageSubject` skip
   * already excludes it and the `state === "INVALID"` line never fires — sabotaging it away left the
   * suite green, which is the definition of a comment rather than a guard. A later change that gave
   * an INVALID page a subject would silently start offering it, where it would read as UNBOUND and
   * lose the fault. So it is driven here with a record that has both. */
  const withSubject = { ...invalid, state: "INVALID", pageSubject: judgeObservedPage(craft({
    url: "https://host.example/a",
    observations: [obsRec("o1", "https://host.example/a", body)],
    bodies: [["o1", body]],
  })).pageSubject, bundleCandidates: [], edges: [] };
  assert.ok(withSubject.pageSubject, "the crafted record has no subject, so it cannot drive the guard");
  assert.deepEqual(toBundle({ pages: [withSubject] }).pageSubjects, [], "an INVALID page carrying a subject was offered to the runner");
});

test("🔴 P8 · UNBOUND, AMBIGUOUS and INVALID can never produce FINDING or CLEAN", () => {
  for (const state of ["UNBOUND", "AMBIGUOUS", "INVALID"]) {
    for (const o of ["FINDING", "CLEAN"]) {
      assert.equal(effectiveOutcome(o, state).outcome, "UNKNOWN", `${o} escaped on ${state}`);
    }
  }
  /* CONTROL: BOUND does let them through, so the rule above is a gate and not a blanket. */
  assert.equal(effectiveOutcome("FINDING", "BOUND").outcome, "FINDING");
  assert.equal(effectiveOutcome("CLEAN", "BOUND").outcome, "CLEAN");
});

/* ================================================================== *
 * P9 / P12 · NOTHING OF THE MATERIAL IS IN THIS REPOSITORY
 * ================================================================== */

test("🔴 P9 · no page body, URL population or client record is committed inside the engine", () => {
  const tracked = execFileSync("git", ["ls-files"], { cwd: REPO, encoding: "utf8" }).split("\n").filter(Boolean);
  assert.ok(tracked.length > 400, `only ${tracked.length} tracked files — the census would police almost nothing`);

  /* 🔴 THE SCOPE OF THIS CENSUS, STATED. Real page URLs already appear in this repository, in
   * derived artifacts committed long before this work — runs/audit/, runs/discovery/,
   * runs/evidence/. Those are pre-existing and out of scope here; the observation-artifact guard
   * covers raw crawl material, and it reports 0. What THIS adapter must not do is add any. So the
   * census is over the files this change introduces, which is the population it can be responsible
   * for — a whole-repository census would have been red before a line of it was written. */
  const grep = (args) => {
    try { return execFileSync("git", ["grep", ...args], { cwd: REPO, encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }).split("\n").filter(Boolean); }
    catch { return []; }
  };
  const MINE = ["src/adapter/observed-page-subject.mjs", "test/observed-page-subject.test.mjs", "bin/detect.mjs"];
  const urls = REAL.pages.filter((p) => p.url).slice(0, 60).map((p) => p.url);
  assert.equal(urls.length, 60, "the leak census has nothing to search for");
  const leaked = urls.filter((u) => grep(["-l", "-F", u, "--", ...MINE]).length > 0);
  assert.deepEqual(leaked, [], `a real page URL is written into this change's own files`);

  /* No archived body text either: sample the start of real bodies. */
  const bodySample = REAL.pages.filter((p) => p.state === "BOUND").slice(0, 10).map((p) => p.bodyIds[0]);
  const bodyLeaks = bodySample.filter((id) => grep(["-l", "-F", id, "--", ...MINE]).length > 0);
  assert.deepEqual(bodyLeaks, [], "a real observation id is hard-coded into this change");

  /* CONTROL: the census DOES find a string that is genuinely in these files. (It used to look for
   * "observation-batch:", which this change deleted along with the mechanism — a control that tests
   * a string the code no longer contains proves nothing, so it now names one the file really has.) */
  assert.ok(grep(["-l", "-F", "SITE_ORIGIN", "--", "src/adapter/observed-page-subject.mjs"]).length > 0,
    "the leak census cannot find a string known to be present — it would report 0 whatever were there");
});

test("🔴 P12 · runs/crawl/corpus remains untracked and non-authoritative", () => {
  const tracked = execFileSync("git", ["ls-files", "runs/crawl"], { cwd: REPO, encoding: "utf8" }).split("\n").filter(Boolean);
  assert.deepEqual(tracked, [], "a runs/crawl file is tracked again");
  /* The adapter reads the external batch, never the local corpus. `git grep` exits 1 when it finds
   * nothing, which is the answer we want — so the absence is read from the exit code, not from an
   * empty string that a thrown error would never have produced. */
  let namesCorpus = true;
  try {
    execFileSync("git", ["grep", "-q", "-F", "runs/crawl/corpus", "--", "src/adapter/observed-page-subject.mjs"], { cwd: REPO, stdio: "ignore" });
  } catch { namesCorpus = false; }
  assert.equal(namesCorpus, false, "the adapter names the local corpus");

  /* CONTROL: the same call DOES find a string the adapter really contains. */
  let findsKnown = false;
  try {
    execFileSync("git", ["grep", "-q", "-F", "observedPageSubjects", "--", "src/adapter/observed-page-subject.mjs"], { cwd: REPO, stdio: "ignore" });
    findsKnown = true;
  } catch { findsKnown = false; }
  assert.equal(findsKnown, true, "the corpus check cannot find anything, so its negative proves nothing");
});

/* ================================================================== *
 * P14 · THE RATE, STATED HONESTLY
 * ================================================================== */

test("🔴 P14 · the bound rate is recorded beside its population, and its limits are asserted", () => {
  assert.equal(REAL.counts.BOUND, 389);
  assert.equal(REAL.population, 495);
  /* What the rate does NOT establish: that the hard bindings work. Every one of these 389 is an
   * exact stored identifier chain — page.observations names the id, the id keys the archive, the
   * hash matches. None of them required inference, and none of them is the sitemap-to-served or
   * claim-to-producer binding the sealed run actually failed. */
  for (const p of REAL.pages.filter((x) => x.state === "BOUND")) {
    assert.equal(p.edges[0].edgeType, "OBSERVATION_OF_PAGE", "a bound page used an edge type other than the exact observation join");
  }
  /* And the unbound remainder is not a defect: 106 pages were never fetched. */
  assert.equal(REAL.counts.UNBOUND, 106);
  assert.equal(REAL.counts.BOUND + REAL.counts.UNBOUND, 495);
});
