/**
 * 🔴 ROW 25 — THE FOUR CHECKS PER PAGE, TENANCY FIRST. THE THIRD STATE MUST FAIL.
 *
 * Tenant proofs A–F (owner architecture ruling, 21 Sep 2026: tenants and resource attachments), the fourteen required
 * proofs, and the real run over the committed archive plus the manifest-pinned capture. Fixtures here are CONTROLS;
 * the real evidence is the capture and the archive, judged at the bottom.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { bindResources } from "../src/tenancy/attachment.mjs";
import { bindClaim, labelValueList, citedSources, sourceKey } from "../src/gate-a/claim-binding.mjs";
import { evaluatePageQuality, tallyPageQuality, row25Verdict, liveControls, readPageCapture, DEFERRED_LIMBS } from "../src/gate-a/page-quality.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { product } from "../src/product.mjs";
import { importSubjectModule } from "../src/subject-roots.mjs";
import { factRegistryRef, externalRootContaining } from "../src/adapter/external-subject.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { readBodyArchive } from "../src/evidence/body-archive.mjs";
import { pagesFromRun } from "../src/crawl/inbound.mjs";
import { batchFile } from "../src/crawl/observation-batch.mjs";

const T1 = "tenant:11111111111111111111111111111111";
const T2 = "tenant:22222222222222222222222222222222";
const decl = (map) => ({ resourceKind, resourceRef }) => map[`${resourceKind}|${resourceRef}`] ?? { state: "UNDECLARED", tenantId: null };
const site = (ref, evidenceClass = "REAL") => ({ resourceKind: "SITE_ORIGIN", resourceRef: ref, evidenceClass });
const reg = (ref, evidenceClass = "REAL") => ({ resourceKind: "FACT_REGISTRY", resourceRef: ref, evidenceClass });

/* ═════════ TENANT PROOFS A–F ═════════ */

test("A · same explicitly declared subject → BOUND (proof 8: same subject with explicit resource attachments)", () => {
  const resolve = decl({ "SITE_ORIGIN|https://a.invalid": { state: "RESOLVED", tenantId: T1 }, "FACT_REGISTRY|reg-a": { state: "RESOLVED", tenantId: T1 } });
  const b = bindResources(resolve, site("https://a.invalid"), reg("reg-a"));
  assert.equal(b.binding, "BOUND");
  assert.equal(b.tenantId, T1);
});

test("B · different declared subjects → INVALID_CROSS_TENANT — never UNKNOWN, never a pass", () => {
  const resolve = decl({ "SITE_ORIGIN|https://a.invalid": { state: "RESOLVED", tenantId: T1 }, "FACT_REGISTRY|reg-b": { state: "RESOLVED", tenantId: T2 } });
  assert.equal(bindResources(resolve, site("https://a.invalid"), reg("reg-b")).binding, "INVALID_CROSS_TENANT");
});

test("C · one declaration absent → UNBOUND (proof 9: missing attachment declaration) — never the usual subject", () => {
  const resolve = decl({ "FACT_REGISTRY|reg-a": { state: "RESOLVED", tenantId: T1 } });
  assert.equal(bindResources(resolve, site("https://undeclared.invalid"), reg("reg-a")).binding, "UNBOUND");
  assert.equal(bindResources(() => ({ state: "UNKNOWN", tenantId: null }), site("x"), reg("y")).binding, "UNKNOWN", "an unreadable declaration source is UNKNOWN, not UNBOUND");
});

test("D · ambiguous subject declarations → AMBIGUOUS (proof 10) — never resolved by order", () => {
  const resolve = decl({ "SITE_ORIGIN|https://a.invalid": { state: "AMBIGUOUS", tenantId: null }, "FACT_REGISTRY|reg-a": { state: "RESOLVED", tenantId: T1 } });
  assert.equal(bindResources(resolve, site("https://a.invalid"), reg("reg-a")).binding, "AMBIGUOUS");
});

test("E · an identity inferred from a hostname or a directory name → REFUSED, before the resolver is even asked", () => {
  let asked = 0;
  const resolve = () => { asked += 1; return { state: "RESOLVED", tenantId: T1 }; };
  for (const inferredFrom of ["HOSTNAME", "DIRECTORY"]) {
    assert.equal(bindResources(resolve, { ...site("https://a.invalid"), inferredFrom }, reg("reg-a")).binding, "REFUSED");
  }
  assert.equal(asked, 0, "an inference must not be laundered through a lookup");
});

test("F · a FIXTURE resource and a REAL resource mixed → INVALID, even when both resolve to one subject", () => {
  const resolve = () => ({ state: "RESOLVED", tenantId: T1 });
  assert.equal(bindResources(resolve, site("https://a.invalid", "FIXTURE"), reg("reg-a", "REAL")).binding, "INVALID");
  assert.equal(bindResources(resolve, site("https://a.invalid", "REAL"), reg("reg-a", "REAL")).binding, "BOUND", "control: the same pair, both REAL, binds");
});

/* ═════════ THE CLAIM PROOFS — a neutral declared vocabulary, no real authority ═════════ */

const SRC = "https://authority.invalid/rules/requirements";
const listFact = { id: "x.list", verificationState: "VERIFIED", value: { value: "Alpha B, Beta B, Gamma B, and Delta C+." }, locale: { place: "Northland", role: "keeper" }, source: { url: SRC } };
const numFact = { id: "x.number", verificationState: "VERIFIED", value: { value: 2 }, locale: { place: "Northland" }, source: { url: SRC } };
const shortFact = { id: "x.short", verificationState: "VERIFIED", value: { value: "B2" }, locale: { place: "Northland" }, source: { url: SRC } };
const cite = (u = SRC) => `<a href="${u}">official page</a>`;
const html = (body) => `<html><body><main>${body}</main></body></html>`;
const CLEAN = html(`Northland keeper requirement: Alpha B · Beta B · Gamma B · Delta C+ ${cite()}`);

test("1 · a clean page — claim, authority, locale and a VERIFIED fact all bind → MATCH", () => {
  assert.equal(bindClaim(CLEAN, listFact).outcome, "MATCH");
});

test("2 · missing source → NO_AUTHORITY — the claim is never attributed by guessing", () => {
  assert.equal(bindClaim(html("Northland keeper: Alpha B · Beta B · Gamma B · Delta C+"), listFact).outcome, "NO_AUTHORITY");
});

test("3 · wrong source → OTHER_AUTHORITY, even when every value matches", () => {
  assert.equal(bindClaim(html(`Northland keeper: Alpha B · Beta B · Gamma B · Delta C+ ${cite("https://elsewhere.invalid/page")}`), listFact).outcome, "OTHER_AUTHORITY");
});

test("4 · an UNVERIFIED fact is ADDRESSED_UNVERIFIED — visible, never present, never a match", () => {
  assert.equal(bindClaim(CLEAN, { ...listFact, verificationState: "UNKNOWN" }).outcome, "ADDRESSED_UNVERIFIED");
});

test("5 · a cross-tenant fact never reaches the page: C and D are INVALID, not 'no facts'", () => {
  const resolve = decl({ "SITE_ORIGIN|https://a.invalid": { state: "RESOLVED", tenantId: T1 }, "FACT_REGISTRY|reg-b": { state: "RESOLVED", tenantId: T2 } });
  const [r] = evaluatePageQuality({ pages: [{ id: "https://a.invalid/p", origin: "https://a.invalid", evidenceClass: "REAL", html: CLEAN }], facts: [listFact], registry: reg("reg-b"), resolve, linkVerdicts: new Map() });
  assert.equal(r.tenancy, "INVALID_CROSS_TENANT");
  assert.deepEqual([r.C.state, r.D.state], ["INVALID", "INVALID"]);
});

test("6 · claim drift — same labels, one value different → DRIFT, and source integrity FAILS", () => {
  const drift = html(`Northland keeper requirement: Alpha B · Beta B · Gamma B · Delta B ${cite()}`);
  const b = bindClaim(drift, listFact);
  assert.equal(b.outcome, "DRIFT");
  assert.deepEqual(b.differing, ["delta"]);
});

test("7 · the same value about the wrong subject → LOCALE_ABSENT — a value match is not a claim", () => {
  assert.equal(bindClaim(html(`Southland keeper requirement: Alpha B · Beta B · Gamma B · Delta C+ ${cite()}`), listFact).outcome, "LOCALE_ABSENT");
});

test("11 · a short and a numeric VERIFIED fact are detected — when authority and locale bind them", () => {
  assert.equal(bindClaim(html(`In Northland the certificate is valid for 2 years ${cite()}`), numFact).outcome, "MATCH");
  assert.equal(bindClaim(html(`In Northland the level is B2 ${cite()}`), shortFact).outcome, "MATCH");
  assert.equal(bindClaim(html(`In Northland the certificate is valid for 12 years ${cite()}`), numFact).outcome, "NOT_STATED", "2 inside 12 is not 2");
  assert.equal(bindClaim(html("In Northland there are 2 posts"), numFact).outcome, "NO_AUTHORITY", "a bare number with no cited authority binds nothing");
});

test("🔴 CONFLICTING — the same page stating the list twice, differently, is never a silent pick", () => {
  const both = html(`Northland keeper: Alpha B · Beta B · Gamma B · Delta C+ … later: Alpha B · Beta B · Gamma B · Delta B ${cite()}`);
  assert.equal(bindClaim(both, listFact).outcome, "CONFLICTING");
});

test("🔴 label→value lists parse from the fact's own words; prose is not a list", () => {
  assert.deepEqual(Object.fromEntries(labelValueList(listFact.value.value)), { alpha: "b", beta: "b", gamma: "b", delta: "c+" });
  assert.equal(labelValueList("Applicants must sit the right version of the test, chosen from three delivery modes"), null);
  assert.equal(labelValueList(42), null);
  assert.ok(citedSources(CLEAN).has(sourceKey(SRC)));
});

/* ═════════ THE FOUR CHECKS, THE ARITHMETIC AND THE VERDICT ═════════ */

test("12 · 13 · the controls — a shared shell is not unique value, a twin is an overlap, and each clean control stays silent", () => {
  const c = liveControls({ fact: listFact });
  for (const k of ["A", "B", "C", "D"]) assert.deepEqual(c[k], { fires: true, silent: true }, k);
});

test("🔴 B has a third state: a measured overlap over too few residual words is NOISY, never a pass", () => {
  const resolve = () => ({ state: "RESOLVED", tenantId: T1 });
  const shell = `<nav>${Array.from({ length: 80 }, (_, i) => `nav${i}`).join(" ")}</nav>`;
  const pages = ["a", "b", "c"].map((id, i) => ({ id: `https://a.invalid/g/${id}`, origin: "https://a.invalid", evidenceClass: "REAL", html: `<html><body>${shell}<main>${i === 0 ? "tiny page" : Array.from({ length: 300 }, (_, k) => `${id}${k}`).join(" ")}</main></body></html>` }));
  const rs = evaluatePageQuality({ pages, facts: [], registry: reg("r"), resolve, linkVerdicts: new Map() });
  assert.equal(rs[0].B.state, "NOISY");
  assert.equal(rs[1].B.state, "PASS");
});

test("14 · fixture-only evidence cannot tick row 25 — and one passing check never hides another", () => {
  const resolve = () => ({ state: "RESOLVED", tenantId: T1 });
  const fixtureOnly = evaluatePageQuality({ pages: [{ id: "https://a.invalid/p", origin: "https://a.invalid", evidenceClass: "FIXTURE", html: CLEAN }], facts: [listFact], registry: reg("r", "FIXTURE"), resolve, linkVerdicts: new Map([[sourceKey(SRC), "LIVE"]]) });
  const controls = liveControls({ fact: listFact });
  const v = row25Verdict({ results: fixtureOnly, controls });
  assert.equal(v.verdict, "NOT_PASS");
  assert.ok(v.reasons.some((r) => r.code === "C_NO_REAL_BOUND_CLAIM"));
  const noControls = row25Verdict({ results: fixtureOnly, controls: null });
  assert.ok(noControls.reasons.some((r) => r.code === "D_CLEAN_CONTROL_MISSING"));
});

test("🔴 a page carrying an unsourced or drifting claim never passes source integrity; NO_BOUND_CLAIM is never PASS", () => {
  const resolve = () => ({ state: "RESOLVED", tenantId: T1 });
  const pages = [
    { id: "https://a.invalid/drift", origin: "https://a.invalid", evidenceClass: "REAL", html: html(`Northland keeper requirement: Alpha B · Beta B · Gamma B · Delta B ${cite()}`) },
    { id: "https://a.invalid/none", origin: "https://a.invalid", evidenceClass: "REAL", html: html("Northland keeper: most keepers need grade B") },
    { id: "https://a.invalid/clean", origin: "https://a.invalid", evidenceClass: "REAL", html: CLEAN },
  ];
  const rs = evaluatePageQuality({ pages, facts: [listFact], registry: reg("r"), resolve, linkVerdicts: new Map([[sourceKey(SRC), "LIVE"]]) });
  assert.deepEqual(rs.map((r) => r.D.state), ["FAIL", "NO_BOUND_CLAIM", "PASS"]);
  const gone = evaluatePageQuality({ pages: [pages[2]], facts: [listFact], registry: reg("r"), resolve, linkVerdicts: new Map([[sourceKey(SRC), "GONE"]]) });
  assert.equal(gone[0].D.state, "FAIL", "a clean claim whose source is GONE fails");
  const unchecked = evaluatePageQuality({ pages: [pages[2]], facts: [listFact], registry: reg("r"), resolve, linkVerdicts: new Map() });
  assert.equal(unchecked[0].D.state, "UNKNOWN", "an unchecked source is UNKNOWN, never PASS");
  const t = tallyPageQuality(rs);
  assert.equal(t.remainder, 0);
});

test("🔴 the deferred limbs are machine-readable, DEFERRED, and never counted", () => {
  assert.deepEqual(DEFERRED_LIMBS.map((d) => [d.limb, d.state]), [["right-to-exist", "DEFERRED"], ["cannibalization", "DEFERRED"], ["technical-readiness", "DEFERRED"]]);
  assert.ok(DEFERRED_LIMBS.every((d) => d.authority === "PASS_BOUNDARIES_SOURCE.md:326"));
});

test("🔴 THE CAPTURE REFUSES RATHER THAN SHORTENS — absent, undeclared and tampered files all throw", async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { createHash } = await import("node:crypto");
  const { SUBJECT_ROOTS_ENV } = await import("../src/subject-roots.mjs");
  const root = mkdtempSync(join(tmpdir(), "page-capture-"));
  try {
    const env = { [SUBJECT_ROOTS_ENV]: root };
    assert.throws(() => readPageCapture({ captureId: "capture-0001", env }), /PAGE_CAPTURE_UNAVAILABLE/);
    /* F03: a root that DECLARES no captures store is refused (above); declared, but without the capture, still UNAVAILABLE */
    mkdirSync(join(root, "captures"), { recursive: true });
    (await import("./helpers/root-registry.mjs")).declareRoot(root, { stores: { CAPTURES: "captures" } });
    assert.throws(() => readPageCapture({ captureId: "capture-0001", env }), /PAGE_CAPTURE_UNAVAILABLE: 'capture-0001' is not in the declared CAPTURES store/);
    const dir = join(root, "captures", "capture-0001");
    mkdirSync(dir, { recursive: true });
    const body = "<html><body>a page</body></html>";
    writeFileSync(join(dir, "p.html"), body);
    const sha = createHash("sha256").update(body).digest("hex");
    writeFileSync(join(dir, "manifest.json"), JSON.stringify({ pages: [{ file: "p.html", url: "https://a.invalid/p", origin: "https://a.invalid", sha256: sha }] }));
    assert.equal(readPageCapture({ captureId: "capture-0001", env }).length, 1, "control: the intact capture reads");
    writeFileSync(join(dir, "p.html"), `${body} `);
    assert.throws(() => readPageCapture({ captureId: "capture-0001", env }), /PAGE_CAPTURE_INVALID: p\.html hashes/);
    writeFileSync(join(dir, "p.html"), body);
    writeFileSync(join(dir, "extra.html"), body);
    assert.throws(() => readPageCapture({ captureId: "capture-0001", env }), /PAGE_CAPTURE_INVALID: extra\.html is not declared/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/* ═════════ THE REAL EVIDENCE ═════════ */

test("🟢 REAL — 391 pages through the production path: 362 cross-tenant, 27 bound with no bound claim, 2 selected — both FAIL source integrity on a drift the VERIFIED fact exposes", async () => {
  await (await import("./support/subjects.mjs")).subjectModule("almi-oet", "product.mjs");
  const P = product("almi-oet");
  const { records } = await loadRegistry(P.factsDir, "almi-oet");
  const root = externalRootContaining(P.factsDir, process.env);
  const registry = { ...factRegistryRef({ factsDir: P.factsDir, rootPath: root.path }), evidenceClass: "REAL" };
  const archive = pagesFromRun({ crawlRecords: createJsonlStore(batchFile("first-real-crawl-2026-09-12.jsonl")).readAll(), bodies: readBodyArchive(batchFile("bodies-2026-09-12.jsonl.br")) }).filter((p) => p.html !== null);
  const captured = readPageCapture({ captureId: "row25-2026-09-21" });
  const population = [...archive.map((p) => ({ id: p.canonical, html: p.html, origin: new URL(p.canonical).origin, evidenceClass: "REAL" })), ...captured];
  const si = JSON.parse((await import("node:fs")).readFileSync(new URL("../runs/audit/source-integrity-2026-09-13.json", import.meta.url), "utf8"));
  const results = evaluatePageQuality({ pages: population, facts: records, registry, resolve: createTenantResolver(), linkVerdicts: new Map(si.results.map((r) => [sourceKey(r.url), r.verdict])), now: new Date("2026-09-13T00:00:00Z") });
  const t = tallyPageQuality(results);
  assert.deepEqual([t.total, t.real, t.fixture, t.crossTenantOrInvalid, t.unbound, t.boundNoClaim, t.selected], [391, 391, 0, 362, 0, 27, 2]);
  assert.deepEqual([t.PASS, t.FAIL, t.UNKNOWN, t.INVALID, t.remainder], [0, 2, 27, 362, 0]);
  const selected = results.filter((r) => r.tenancy === "BOUND" && r.C.state !== "NO_BOUND_CLAIM");
  assert.deepEqual(selected.map((r) => r.id).sort(), ["https://almioet.almiworld.com/nursing/from-afghanistan/ie-nmbi", "https://almioet.almiworld.com/register/ie-nmbi"]);
  for (const r of selected) {
    assert.equal(r.D.state, "FAIL");
    assert.equal(r.C.state, "ADDRESSED_NOT_PRESENT");
    const [b] = r.C.bindings;
    assert.equal(b.outcome, "DRIFT");
    assert.deepEqual(b.differing, ["writing"]);
    assert.equal(b.verificationState, "VERIFIED");
  }
  const listFactReal = records.find((r) => r.id === "ie-nmbi.oet-minimum-grade.profession=nursing");
  const v = row25Verdict({ results, controls: liveControls({ fact: listFactReal }) });
  assert.equal(v.verdict, "PASS", JSON.stringify(v.reasons));
});
