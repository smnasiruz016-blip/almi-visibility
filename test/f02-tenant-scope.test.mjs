/**
 * 🔴 F02 · THE TENANT-SCOPE CENSUS'S EXCLUSIONS, EACH WITH A CONTROL THAT EXISTS AND FIRES — and F02 ACCEPTANCE AMENDMENT 2 (_handoffs
 * fb0613a, RR-225): a research batch F31's existing-page reader locates for a tenant is read only on F02's recorded decision.
 *
 * This file is the one tools/tenant-scope-census.mjs has named as its controls since 24 September ("test/f02-tenant-scope.test.mjs
 * F02-EXCL-1 / F02-EXCL-3") without it ever existing (found RR-224). Every exclusion now names a test here or in
 * test/f02-real-prerequisites.test.mjs that exists, and F02-EXCL-META refuses an exclusion whose control does not.
 * Fixture data roots only (RR-177): no page of any real client is read. Nothing here writes to the production trail.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

import { EXCLUSIONS, FAMILIES, derivedFamilyReaders, classifyEntryPoint, census } from "../tools/tenant-scope-census.mjs";
import { isLibraryModule } from "../src/entry-points.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { decideForTenant } from "../src/tenancy/scope.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { SITEMAP_BATCH_ID } from "../src/adapter/sitemap-subject.mjs";
import { readNewerCollections, newerBatchDecisions } from "../src/crawl/newer-collections.mjs";
import { decideResearchBatch, BATCH_DECISION, RULE } from "../src/tenancy/research-batch-decision.mjs";
import { readExistingPagePopulation } from "../src/page/existing-page-population.mjs";
import { durableGuardSink, guardAuthority, GUARD_METADATA_KEYS } from "../src/governance/guard-audit.mjs";
import { metadataFaults } from "../src/audit-trail/event.mjs";
import { f31FixtureRoot, FA, FZ, TA, TZ, SUBJECT_A, SUBJECT_Z, obs, page, sitemapRec, run } from "./helpers/f31-fixture-root.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const NEW = "2026-10-05T00:00:00Z";
const SEVEN = ["bin/entity-map.mjs", "bin/page-briefs.mjs", "bin/page-decay.mjs", "bin/page-duplication.mjs", "bin/page-indexation.mjs", "bin/page-information-gain.mjs", "bin/page-structured-data.mjs"];
const LIBRARY = execFileSync("git", ["-C", REPO, "ls-files", "src", "subjects"], { encoding: "utf8" }).split("\n").filter(isLibraryModule);
const text = (f) => readFileSync(join(REPO, f), "utf8");
const FIXED = () => ({
  records: [obs("fa1", `${FA}/`, { body: "<h1>Home</h1>" }), page(`${FA}/`, ["fa1"]), obs("fz1", `${FZ}/`, { body: "<h1>Zed</h1>" }), page(`${FZ}/`, ["fz1"])],
  bodies: [["fa1", "<h1>Home</h1>"], ["fz1", "<h1>Zed</h1>"]], edges: [], sitemaps: [sitemapRec(FA, [`${FA}/`])],
});
const batch = (attachTo, namedBy, url) => ({ attachTo, namedBy, crawl: [obs(`o-${url.length}-${attachTo ?? "none"}`, url, { at: NEW }), run()] });
function withWorld(spec, fn) { const w = f31FixtureRoot(spec); try { return fn(w, createTenantResolver({ env: w.env })); } finally { w.cleanup(); } }
/** A census over the real library plus one planted module, classifying the real entry points (and nothing written anywhere). */
function plantedCensus(file, source, eps = SEVEN) {
  const readers = derivedFamilyReaders({ files: [...LIBRARY, file], read: (f) => (f === file ? source : text(f)) });
  return new Map(eps.map((ep) => [ep, classifyEntryPoint(ep, text(ep), readers).cls]));
}
/** The entry points a planted same-name function in ANOTHER file turns from SCOPED to UNSCOPED — the exclusion is load-bearing and file-bound. */
function turnedUnscoped(file, source) {
  const real = new Map(census().map((r) => [r.file, r.cls]));
  const scoped = [...real].filter(([, c]) => c === "SCOPED").map(([f]) => f);
  const planted = plantedCensus(file, source, scoped);
  return scoped.filter((f) => planted.get(f) === "UNSCOPED");
}

/* ================= every exclusion's control EXISTS ================= */
/** The fault list for an exclusion set: the module defines the function; the control names an existing test file AND a test in it. */
export function exclusionControlFaults(exclusions, read = (f) => (existsSync(join(REPO, f)) ? text(f) : null)) {
  const faults = [];
  for (const e of exclusions) {
    const mod = read(e.module);
    if (mod === null || !new RegExp(`(function ${e.fn}\\(|const ${e.fn}\\s*=)`).test(mod)) faults.push(`${e.module}#${e.fn}: the module does not define the function`);
    const m = /^(test\/[\w.-]+\.test\.mjs)\s+([A-Z0-9][\w-]*)\s*:/.exec(e.control ?? "");
    if (!m) { faults.push(`${e.module}#${e.fn}: the control names no test file and test id`); continue; }
    const t = read(m[1]);
    if (t === null) faults.push(`${e.module}#${e.fn}: the control's file ${m[1]} does not exist`);
    else if (!new RegExp(`test\\(\\s*["'\`]${m[2]} `).test(t)) faults.push(`${e.module}#${e.fn}: ${m[1]} holds no test ${m[2]}`);
  }
  return faults;
}
test("F02-EXCL-META · every census exclusion names a module that defines its function and a control test that EXISTS — a missing control is refused", () => {
  assert.equal(EXCLUSIONS.length, 6, "the exclusion population moved");
  assert.deepEqual(exclusionControlFaults(EXCLUSIONS), []);
  const planted = [...EXCLUSIONS, { fn: "readNewerCollections", module: "src/crawl/newer-collections.mjs", control: "test/f02-never-created.test.mjs F02-EXCL-9: none" }];
  assert.deepEqual(exclusionControlFaults(planted), ["src/crawl/newer-collections.mjs#readNewerCollections: the control's file test/f02-never-created.test.mjs does not exist"], "the meta-control cannot see a missing control");
});

/* ================= F02-EXCL-1 · derivedForbiddenSubstrings ================= */
test("F02-EXCL-1 · the held-out payload derivation only ever NARROWS what an audit append accepts: its one output feeds the store's refusal list and nothing else; matched by file AND name", () => {
  const calls = ["src", "bin", "tools"].flatMap((d) => execFileSync("git", ["-C", REPO, "ls-files", d], { encoding: "utf8" }).split("\n").filter((f) => f.endsWith(".mjs")))
    .flatMap((f) => text(f).split("\n").map((l, i) => ({ f, i, l }))).filter((x) => /\bderivedForbiddenSubstrings\(/.test(x.l) && !/function derivedForbiddenSubstrings\(/.test(x.l));
  assert.deepEqual(calls.map((x) => x.f), ["src/audit-trail/wiring.mjs"], "the derivation is used somewhere other than the audit wiring");
  assert.match(calls[0].l, /^\s*forbiddenSubstrings:\s*forbiddenSubstrings \?\? derivedForbiddenSubstrings\(/, "the derivation's output feeds something other than the store's refusal list");
  assert.deepEqual(metadataFaults({ note: "plain words" }, []), [], "CONTROL: without a substring nothing is refused");
  assert.ok(metadataFaults({ note: "plain words" }, ["plain"]).length > 0, "a forbidden substring did not narrow what is accepted");
  /* load-bearing and bound to its file: the same name in another file is NOT excused, and the entry points reaching the wiring turn UNSCOPED */
  const turned = turnedUnscoped("src/planted-excl1.mjs", 'export function derivedForbiddenSubstrings() { return createJsonlStore(join(repo, "runs", "evidence", "evidence.jsonl")).readAll(); }\n');
  assert.ok(turned.length > 0, "a same-named derivation in another file was excused by its name alone (or the exclusion carries nothing)");
  assert.equal(new Set(EXCLUSIONS.map((e) => `${e.module}#${e.fn}`)).has("src/audit-trail/wiring.mjs#derivedForbiddenSubstrings"), true);
});

/* ================= F02-EXCL-3 · memberOrigins, batchPageUrls, sitemapListedUrls ================= */
test("F02-EXCL-3 · the gate's member read returns ORIGINS only — never a body — and the decision it feeds refuses a shared batch as AMBIGUOUS", () => {
  /* the whole batch attached to ONE tenant while its members' origins are declared to two: only the member read can see that */
  withWorld({ fixed: FIXED(), extraAttachments: [["CRAWL_BATCH", BATCH_ID, TA], ["SITEMAP_COLLECTION", SITEMAP_BATCH_ID, TA]] }, (w, resolve) => {
    const crawl = RESOURCES.crawlBatch(BATCH_ID, { env: w.env }).members;
    const maps = RESOURCES.sitemapCollection(SITEMAP_BATCH_ID, { env: w.env }).members;
    for (const m of [...crawl, ...maps]) {
      assert.deepEqual(Object.keys(m).sort(), ["resourceKind", "resourceRef"], "a member carries more than its identity");
      assert.equal(m.resourceKind, "SITE_ORIGIN");
      assert.equal(m.resourceRef, new URL(m.resourceRef).origin, "a member read returned more than an origin (a path, a page, a body)");
    }
    assert.deepEqual(crawl.map((m) => m.resourceRef), [FA, FZ].sort(), "the crawl batch's members are not its pages' identities");
    assert.deepEqual(maps.map((m) => m.resourceRef), [FA], "the sitemap collection's members are not its listed URLs' identities");
    assert.equal(decideForTenant(resolve, TA, RESOURCES.crawlBatch(BATCH_ID, { env: w.env })).outcome, "AMBIGUOUS_REFUSED", "a batch shared by two tenants was granted whole");
    assert.equal(decideForTenant(resolve, TA, RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID)).outcome.endsWith("ALLOWED"), true, "CONTROL: the tenant's partition is lawful");
  });
});

/* ================= F02-EXCL-4 + A2 · F31's reader, on F02's recorded decision ================= */
const decisionsOf = (w, resolve, tenantId = TA) => { const rec = []; const read = readNewerCollections({ tenantId, resolve, env: w.env, record: (e) => rec.push(e) }); return { rec, read: read.map((n) => n.batchId) }; };
test("F02-EXCL-4 · A2 [EXPECTED, EVIDENCE] a batch attached and named is read, ALLOWED and recorded; an attached batch named by no subject is refused NOT_A_MEMBER and recorded, never read", () => {
  withWorld({ fixed: FIXED(), batches: { "newer-a": batch(TA, SUBJECT_A, `${FA}/a`), "unnamed": batch(TA, null, `${FA}/u`) } }, (w, resolve) => {
    const { rec, read } = decisionsOf(w, resolve);
    assert.deepEqual(read, ["newer-a"], "a batch was read without F02's ALLOWED decision");
    assert.deepEqual(rec.map((e) => [e.eventType, e.action, e.outcome, e.reasonCode]), [
      ["SCOPE_RESOLUTION", "RESOLVE_RESEARCH_BATCH", "ALLOWED", BATCH_DECISION.ALLOWED],
      ["REFUSAL", "REFUSE_RESEARCH_BATCH", "REFUSED", BATCH_DECISION.NOT_A_MEMBER],
    ], "a decision was not recorded, or a refusal was skipped silently");
    /* the tenant decision: both batches are attached to this tenant — the refusal is the SUBJECT's, not the attachment's */
    assert.deepEqual(rec.map((e) => e.metadata.classification), ["SAME_TENANT_ALLOWED", "SAME_TENANT_ALLOWED"], "a decision was recorded without the tenant decision");
    for (const e of rec) {
      assert.deepEqual(Object.keys(e.metadata).filter((k) => !GUARD_METADATA_KEYS.includes(k)), []);
      assert.deepEqual(metadataFaults(e.metadata), []);
      assert.equal(e.metadata.ruleEntry, RULE.slice(0, 120));      assert.match(e.metadata.resourceRef, /^[0-9a-f]{16}$/, "a decision names the batch itself instead of its digest");
      assert.doesNotMatch(JSON.stringify(e), /newer-a|unnamed|tenant:/, "a decision carries a batch name or a tenant id");
    }
  });
});
test("F02-EXCL-4 · A2 [FAILURE] a batch attached to ANOTHER tenant, or to NONE, that this tenant's subject names is refused NOT_ATTACHED and recorded; a subject mixing tenants makes every batch it names unread", () => {
  withWorld({ fixed: FIXED(), batches: { "newer-a": batch(TA, SUBJECT_A, `${FA}/a`), "elsewhere": batch(TZ, SUBJECT_A, `${FA}/e`) } }, (w, resolve) => {
    const { rec, read } = decisionsOf(w, resolve);
    assert.deepEqual(read, [], "a batch of a subject that does not resolve to this tenant was read");
    assert.deepEqual(rec.map((e) => e.reasonCode).sort(), [BATCH_DECISION.NOT_ATTACHED, BATCH_DECISION.NOT_A_MEMBER].sort(), "a refusal went unrecorded");
  });
  withWorld({ fixed: FIXED(), batches: { "newer-a": batch(TA, SUBJECT_A, `${FA}/a`), "nowhere": batch(null, SUBJECT_A, `${FA}/n`) } }, (w, resolve) => {
    const { rec, read } = decisionsOf(w, resolve);
    assert.deepEqual(read, []);
    assert.ok(rec.some((e) => e.reasonCode === BATCH_DECISION.NOT_ATTACHED && /_REFUSED$/.test(e.metadata.classification)), "an unattached batch was not refused NOT_ATTACHED, with its tenant decision");
  });
  withWorld({ fixed: FIXED(), batches: { "other-z": batch(TZ, SUBJECT_Z, `${FZ}/z`) } }, (w, resolve) => {
    const { rec, read } = decisionsOf(w, resolve);
    assert.deepEqual([read, rec], [[], []], "another tenant's own batch was located, read or named in this tenant's record");
    assert.deepEqual(decisionsOf(w, resolve, TZ).read, ["other-z"], "CONTROL: its own tenant reads it");
  });
  withWorld({ fixed: FIXED() }, (w, resolve) => {
    const d = decideResearchBatch({ resolve, tenantId: TA, batchId: "not-declared", named: new Set(["not-declared"]) });
    assert.deepEqual([d.allowed, d.outcome], [false, BATCH_DECISION.NOT_ATTACHED], "a named but undeclared batch was allowed");
  });
});
test("F02-EXCL-4 · A2 [EVIDENCE] the decisions reach a GOVERNED run's durable guard sink through the loader's scope, payload-free and metadata-only", () => {
  withWorld({ fixed: FIXED(), batches: { "newer-a": batch(TA, SUBJECT_A, `${FA}/a`), "unnamed": batch(TA, null, `${FA}/u`) } }, (w, resolve) => {
    const appended = [];
    const sink = durableGuardSink({ store: { append: (event) => (appended.push(event), { event, appended: true }) }, actor: "test", softwareVersion: "engine:test", correlationId: `run:f02-a2:${process.pid}`, ...guardAuthority({ now: "2026-10-08" }) });
    readExistingPagePopulation({ scope: { tenantId: TA, recordDecision: (d) => sink.emit(d) }, resolve, env: w.env });
    const mine = appended.filter((e) => /RESEARCH_BATCH/.test(e.action));
    assert.deepEqual(mine.map((e) => [e.action, e.outcome]), [["RESOLVE_RESEARCH_BATCH", "ALLOWED"], ["REFUSE_RESEARCH_BATCH", "REFUSED"]], "the governed run's record does not show what was read and why");
    assert.ok(mine.every((e) => e.correlationId === `run:f02-a2:${process.pid}`));
  });
});
test("F02-EXCL-4 · A2 [CENSUS] the seven entry points that reach F31's reader are SCOPED with the exception; a function of the SAME NAME in another file is not excused (they turn UNSCOPED); a direct RESEARCH load stays UNSCOPED; every other row unchanged", () => {
  const rows = census();
  for (const ep of SEVEN) assert.equal(rows.find((r) => r.file === ep).cls, "SCOPED", `${ep} is not SCOPED`);
  assert.deepEqual(rows.filter((r) => r.cls === "UNSCOPED").map((r) => r.file), []);
  const sc = plantedCensus("src/planted-reader.mjs", 'export function readNewerCollections() { return lookupStore(rootIndexFor(env), "RESEARCH"); }\n');
  assert.deepEqual(SEVEN.filter((ep) => sc.get(ep) !== "UNSCOPED"), [], "a same-named function in another file was excused by its name alone");
  const direct = census({ sources: [{ file: "bin/planted-research.mjs", text: 'import { lookupStore } from "../src/tenancy/root-registry.mjs";\nconst s = lookupStore(rootIndexFor(process.env), "RESEARCH");\n' }] });
  assert.equal(direct[0].cls, "UNSCOPED", "an entry point loading the RESEARCH family undeclared was not refused");
  assert.equal(FAMILIES.RESEARCH.resource, "research|researchBatch", "the RESEARCH family's lawful resources moved");
});
test("F02-EXCL-4 · the exception names THIS reader by file and function, with its reason and control, and the census matches it by both", () => {
  const e = EXCLUSIONS.filter((x) => x.fn === "readNewerCollections");
  assert.deepEqual(e.map((x) => x.module), ["src/crawl/newer-collections.mjs"]);
  assert.match(e[0].why, /ALLOWED decision/);
  assert.match(text("tools/tenant-scope-census.mjs"), /EXCLUSIONS\.map\(\(e\) => `\$\{e\.module\}#\$\{e\.fn\}`\)/, "the census matches exclusions by name alone");
  assert.match(text("src/crawl/newer-collections.mjs"), /for \(const x of decisions\) record\?\.\(x\.event\);/, "the reader does not record every decision");
});

test("the production trail was not written by this file", () => assert.equal(trailSha(), TRAIL_BEFORE));
