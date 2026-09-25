/**
 * 🔴 F09 · CROSS-CLIENT PORTABILITY — proved on the REAL subject the owner supplied, never on a fixture.
 *
 *   Acceptance: _handoffs/AlmiVisibility_F09_ACCEPTANCE_2026-09-25.md (cf10494 · sha256 5b85d04e… · contract d0c8bd96…).
 *
 * GENERIC BY CONSTRUCTION: this file names no subject, host or vocabulary (clarification 10). The subject under proof is found
 * STRUCTURALLY — the real external-root subject whose descriptor declares a research batch attached to its tenant — so the same
 * file proves the next such subject without an edit. Fixtures appear only to prove refusal branches (clarification 16).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync, execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { decideForTenant, resolveSide, refDigest } from "../src/tenancy/scope.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { lookupSubject, lookupStore, declaredSubjectIds } from "../src/tenancy/root-registry.mjs";
import { subjectRoots, SUBJECT_ROOTS_ENV } from "../src/subject-roots.mjs";
import { evidenceStateOf } from "../src/evidence/evidence-state-adapters.mjs";
import { authorise } from "../src/governance/authorisation.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { loadAllSubjectPackages } from "../src/subject-package.mjs";
import { resolveDeclarationRoot, tenantDir, currentPointer } from "../src/intake/store.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha = (s) => createHash("sha256").update(s).digest("hex");
const R = createTenantResolver();
const attachments = R.declarations.attachments ?? [];
const tenantOf = (kind, ref) => attachments.filter((a) => a.resourceKind === kind && a.resourceRef === ref).map((a) => a.tenantId);

/** The subjects under proof: real external-root subjects whose descriptor declares a research batch attached to their tenant. */
function subjectsUnderProof(resolve = R) {
  const out = [];
  for (const id of declaredSubjectIds(resolve.roots)) {
    const l = lookupSubject(resolve.roots, id);
    if (l.state !== "DECLARED" || l.rootKind !== "external") continue;
    const file = join(l.dir, "descriptor.json");
    if (!existsSync(file)) continue;
    const d = JSON.parse(readFileSync(file, "utf8"));
    for (const batch of d.declares?.researchBatches ?? []) out.push({ id, dir: l.dir, descriptor: d, batch, entry: l.entry });
  }
  return out;
}
const UNDER_PROOF = subjectsUnderProof();
const one = () => { assert.ok(UNDER_PROOF.length >= 1, "no real subject declares a research batch — F09's population is EMPTY, which cannot close the evidence clause"); return UNDER_PROOF[0]; };

/** The stable identity of a subject, as the current declarations resolve it — digests only, never a tenant id. */
function identityRows(resolve, s) {
  const side = resolveSide(resolve, RESOURCES.subject(s.id));
  const rows = [`SUBJECT|${s.id}|${side.state}|${refDigest("TENANT", side.tenantId ?? "-")}`];
  for (const c of lookupSubject(resolve.roots, s.id).entry?.connectors ?? []) rows.push(`CONNECTOR|${s.id}#${c.kind}|${decideForTenant(resolve, side.tenantId, RESOURCES.connector(s.id, c.kind)).outcome}`);
  rows.push(`BATCH|${s.batch}|${decideForTenant(resolve, side.tenantId, RESOURCES.researchBatch(s.batch)).outcome}`);
  return rows.sort();
}

/* ═══ INPUT · a real, independently existing subject, its declaration, resources and bounded goal ═══════════════════ */

test("F09 · INPUT · the subject is REAL and not a fixture: declared in an EXTERNAL root, with an accepted F01 declaration and a real crawled population", () => {
  const s = one();
  const l = lookupSubject(R.roots, s.id);
  assert.equal(l.rootKind, "external", "the subject lives in the engine's fixture root — a fixture cannot close F09");
  const side = resolveSide(R, RESOURCES.subject(s.id));
  assert.equal(side.state, "RESOLVED");
  /* F01: an ACCEPTED declaration exists for the subject's tenant, read through the production intake store. */
  const root = resolveDeclarationRoot();
  assert.equal(root.ok, true, root.code);
  const dir = join(root.dir, "tenants", tenantDir(side.tenantId));
  assert.ok(existsSync(dir), "no F01 declaration exists for the subject's tenant");
  const projects = readdirSync(dir);
  const current = projects.map((p) => currentPointer(root, side.tenantId, p)).filter(Boolean);
  assert.ok(current.length >= 1, "the subject's tenant holds no CURRENT accepted declaration");
  const crawl = readFileSync(join(lookupStore(R.roots, "RESEARCH").dir, s.batch, "crawl.jsonl"), "utf8").split("\n").filter(Boolean).map((l2) => JSON.parse(l2));
  const pages = crawl.filter((r) => r.record_type === "observation" && r.value?.status === 200);
  assert.ok(pages.length >= 1, "the real population is EMPTY");
  console.log(`F09-POPULATION ${JSON.stringify({ platform: process.platform, subjectsUnderProof: UNDER_PROOF.length, observations: crawl.filter((r) => r.record_type === "observation").length, http200: pages.length, runRecords: crawl.filter((r) => r.record_type === "crawl_run").length })}`);
  assert.ok(crawl.some((r) => r.record_type === "crawl_run" || r.run_id), "no production crawl run record — the population was not produced by the production crawler");
});

/* ═══ EXPECTED · onboarded, resolved and processed through the same boundaries; confined to its own tenant ═════════════ */

test("F09 · EXPECTED · the research batch is attached by STRUCTURAL PROOF rule 2: the subject's descriptor declares it and the subject resolves to exactly that tenant — CONTROL: another tenant is refused", () => {
  one(); /* an EMPTY population must be RED here, never a vacuous loop that passes (CI caught this on #161, data main without the subject) */
  for (const s of UNDER_PROOF) {
    const side = resolveSide(R, RESOURCES.subject(s.id));
    assert.deepEqual(tenantOf("RESEARCH_BATCH", s.batch), [side.tenantId], "the batch is not attached to exactly the subject's tenant");
    assert.equal(decideForTenant(R, side.tenantId, RESOURCES.researchBatch(s.batch)).outcome, "SAME_TENANT_ALLOWED");
    const other = R.declarations.tenants.find((t) => t.status === "ACTIVE" && t.tenantId !== side.tenantId).tenantId;
    assert.equal(decideForTenant(R, other, RESOURCES.researchBatch(s.batch)).outcome, "CROSS_TENANT_REFUSED", "another tenant reached this subject's research batch");
  }
});

test("F09 · EXPECTED · every stored observation belongs to the batch's tenant (structural proof rule 3) and is OBSERVED evidence (F06) — CONTROL: a planted foreign-origin observation is caught", () => {
  one(); /* an EMPTY population must be RED here, never a vacuous loop that passes (CI caught this on #161, data main without the subject) */
  for (const s of UNDER_PROOF) {
    const side = resolveSide(R, RESOURCES.subject(s.id));
    const recs = readFileSync(join(lookupStore(R.roots, "RESEARCH").dir, s.batch, "crawl.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const obs = recs.filter((r) => r.record_type === "observation");
    assert.ok(obs.length >= 1);
    const foreign = (list) => list.filter((o) => { const origin = new URL(o.value.requested_url).origin; return decideForTenant(R, side.tenantId, RESOURCES.siteOrigin(origin)).outcome !== "SAME_TENANT_ALLOWED"; });
    assert.deepEqual(foreign(obs).map((o) => o.observation_id), [], "an observation in the batch belongs to another tenant");
    for (const o of obs) assert.equal(evidenceStateOf(o).state, "OBSERVED", `${o.observation_id} is not OBSERVED evidence`);
    const otherOrigin = attachments.find((a) => a.resourceKind === "SITE_ORIGIN" && a.tenantId !== side.tenantId).resourceRef;
    assert.equal(foreign([{ ...obs[0], value: { ...obs[0].value, requested_url: `${otherOrigin}/` } }]).length, 1, "CONTROL: a foreign-origin observation was not caught");
  }
});

test("F09 · EXPECTED · the stored records carry STRUCTURE ONLY — no body, title, text, e-mail or phone shape (personal-data guard)", () => {
  one(); /* an EMPTY population must be RED here, never a vacuous loop that passes (CI caught this on #161, data main without the subject) */
  for (const s of UNDER_PROOF) {
    const text = readFileSync(join(lookupStore(R.roots, "RESEARCH").dir, s.batch, "crawl.jsonl"), "utf8");
    assert.doesNotMatch(text, /<html|<body|"title"|"text"|"body"\s*:|mailto:|tel:|@[a-z0-9-]+\.[a-z]{2,}/i, "a stored record carries content or a contact shape");
    assert.match(text, /"committed":false/, "the run record does not state that the bodies were not committed");
  }
});

test("F09 · EXPECTED · the crawler REFUSES the engine's shared stores for any tenant (the existing subject's need too) and runs on the declared research batch — the refused and the authorised worlds", () => {
  const s = one();
  const tenant = resolveSide(R, RESOURCES.subject(s.id)).tenantId;
  const run = (args) => spawnSync(process.execPath, ["bin/crawl.mjs", ...args, "--actor=actor:cc"], { cwd: REPO, encoding: "utf8", timeout: 120_000 });
  const shared = run([`--tenant=${tenant}`, `--subject=${s.id}`, "--seeds=" + join(lookupStore(R.roots, "RESEARCH").dir, s.batch, "seeds.txt")]);
  /* An exit code alone proves nothing (any refusal exits 3): pin the REASON — the tenant-scope refusal, with each engine shared
   * store refused for having NO ATTACHMENT to any tenant. */
  const sharedRefused = (r, who) => {
    assert.equal(r.status, 3, `the shared stores were NOT refused for ${who}`);
    const out = `${r.stdout}\n${r.stderr}`;
    assert.match(out, /TENANT SCOPE REFUSED/, `${who}: exit 3 for a reason other than the tenant-scope refusal`);
    for (const store of ["evidence store", "cost ledger", "run artefacts"]) assert.match(out, new RegExp(`${store}\\s+UNDECLARED_REFUSED \\(NO_ATTACHMENT\\)`), `${who}: the ${store} was not refused for want of an attachment`);
  };
  sharedRefused(shared, "the new tenant");
  const existing = declaredSubjectIds(R.roots).find((id) => id !== s.id && lookupSubject(R.roots, id).rootKind === "external");
  assert.ok(existing, "CONTROL: no existing external subject — the existing client's need has no population");
  const existingSide = resolveSide(R, RESOURCES.subject(existing));
  assert.equal(existingSide.state, "RESOLVED", "the existing subject does not resolve to a tenant");
  const existingTenant = existingSide.tenantId;
  const existingShared = run([`--tenant=${existingTenant}`, "--seeds=" + join(lookupStore(R.roots, "RESEARCH").dir, s.batch, "seeds.txt")]);
  sharedRefused(existingShared, "the EXISTING subject's tenant (then the capability would not be needed by it)");
  const own = run([`--tenant=${tenant}`, `--subject=${s.id}`, `--research-batch=${s.batch}`]);
  assert.equal(own.status, 0, `the declared research batch did not run: ${own.stderr.slice(-300)}`);
  const cross = run([`--tenant=${existingTenant}`, `--research-batch=${s.batch}`]);
  assert.equal(cross.status, 3, "another tenant ran on this subject's research batch");
  assert.match(`${cross.stdout}\n${cross.stderr}`, /research batch\s+CROSS_TENANT_REFUSED/, "another tenant was refused the batch for a reason other than the cross-tenant rule");
});

test("F09 · EXPECTED · a tenant run writes ONLY into its own research batch, found through a RELOCATED root — the engine's shared stores and the original root are untouched (no network: a dry run with --confirm records its run)", () => {
  const s = one();
  const tenant = resolveSide(R, RESOURCES.subject(s.id)).tenantId;
  const external = subjectRoots().find((r) => r.kind === "external");
  const copy = mkdtempSync(join(tmpdir(), "f09-run-"));
  const hash = (p) => (existsSync(p) ? sha(readFileSync(p)) : "ABSENT");
  const engineStores = ["runs/cost/ledger.jsonl", "runs/evidence/evidence.jsonl", "runs/crawl/crawl.jsonl"].map((p) => join(REPO, p));
  const originalBatch = join(lookupStore(R.roots, "RESEARCH").dir, s.batch, "crawl.jsonl");
  const before = [...engineStores, originalBatch].map(hash);
  try {
    cpSync(external.path, copy, { recursive: true, filter: (p) => !/[\\/]\.git([\\/]|$)/.test(p) });
    const copyBatch = join(copy, "research", s.batch, "crawl.jsonl");
    const copyBefore = readFileSync(copyBatch, "utf8").split("\n").filter(Boolean).length;
    const r = spawnSync(process.execPath, ["bin/crawl.mjs", `--tenant=${tenant}`, `--subject=${s.id}`, `--research-batch=${s.batch}`, "--confirm", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8", timeout: 120_000, env: { ...process.env, [SUBJECT_ROOTS_ENV]: copy } });
    assert.equal(r.status, 0, r.stderr.slice(-300));
    assert.equal(readFileSync(copyBatch, "utf8").split("\n").filter(Boolean).length, copyBefore + 1, "the run record did not land in the RELOCATED research batch");
    assert.deepEqual([...engineStores, originalBatch].map(hash), before, "the run wrote into an engine shared store or into the ORIGINAL root");
  } finally { rmSync(copy, { recursive: true, force: true }); }
});

test("F09 · EXPECTED · the real run's authorisation decisions are on the audit trail (F04 through F08), and a model is refused the same actions", () => {
  const s = one();
  const tenant = resolveSide(R, RESOURCES.subject(s.id)).tenantId;
  const trail = readFileSync(join(REPO, "audit-trail/events.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const wanted = authorise({ actorRef: "actor:cc", action: "OPEN_CONNECTOR_PUBLIC_SITE", scope: { scopeType: "TENANT", tenantId: tenant }, resourceRef: `${s.id}#PUBLIC_SITE`, now: "2026-09-25T12:00:00Z" });
  assert.equal(wanted.outcome, "AUTHORISED");
  assert.ok(trail.some((e) => e.eventType === "AUTHORISATION_DECISION" && e.action === "OPEN_CONNECTOR_PUBLIC_SITE" && e.outcome === "ALLOWED" && e.metadata?.resourceRef === wanted.resourceRefDigest), "the real crawl's connector decision is not on the trail");
  assert.equal(authorise({ actorRef: "actor:model", action: "OPEN_CONNECTOR_PUBLIC_SITE", scope: { scopeType: "TENANT", tenantId: tenant }, resourceRef: `${s.id}#PUBLIC_SITE`, now: "2026-09-25T12:00:00Z" }).outcome, "DENIED_BY_RULE");
});

test("F09 · EXPECTED · the generic contract 'a PRODUCT is a declared subject that carries a product module': the existing product stays a product, the site-only subject is a subject but not a product, and the production loaders no longer break for anyone (opposite verdicts, both subjects)", async () => {
  const { availableSubjects, availableProductSubjects } = await import("../src/subject-roots.mjs");
  const { availableProducts } = await import("../src/product-cli.mjs");
  const { readDeclaredAxes } = await import("../src/discovery/row6.mjs");
  const s = one();
  const subjects = availableSubjects();
  const products = availableProducts();
  assert.ok(subjects.includes(s.id), "the new subject is not a declared subject");
  assert.ok(!products.includes(s.id), "a subject without a product module was listed as a product");
  const existing = products.find((id) => lookupSubject(R.roots, id).rootKind === "external");
  assert.ok(existing, "CONTROL: no existing external PRODUCT — the opposite verdict has no population");
  assert.deepEqual(products, availableProductSubjects());
  assert.ok(products.length === subjects.filter((id) => existsSync(join(lookupSubject(R.roots, id).dir, "product.mjs"))).length, "the product list is not exactly the subjects carrying a product module");
  /* the production loader that broke for EVERY subject once a site-only subject was declared now reads every product */
  const scope = { decisions: products.flatMap((id) => { const d = decideForTenant(R, resolveSide(R, RESOURCES.subject(id)).tenantId, RESOURCES.subject(id)); return [{ label: id, decision: d }]; }) };
  const axes = await readDeclaredAxes({ scope, resolve: R });
  assert.ok(Object.keys(axes).length >= 1, "the existing products' axes were not read");
  assert.ok(!Object.hasOwn(axes, s.id), "the site-only subject was read as a product");
});

/* ═══ EVIDENCE · portable resolution in two environments; zero shared specialisation ════════════════════════════════════ */

test("F09 · EVIDENCE · the subject resolves to the SAME stable identities from a RELOCATED copy of its root — a declaration move only, no shared-code edit — and prints the fingerprint for the second environment", () => {
  const s = one();
  const here = identityRows(R, s);
  const external = subjectRoots().find((r) => r.kind === "external");
  const copy = mkdtempSync(join(tmpdir(), "f09-relocated-"));
  try {
    cpSync(external.path, copy, { recursive: true, filter: (p) => !/[\\/]\.git([\\/]|$)/.test(p) });
    const moved = createTenantResolver({ env: { ...process.env, [SUBJECT_ROOTS_ENV]: copy } });
    /* The copy is byte-identical, so equal identities alone would also pass if the resolver IGNORED the relocated root and
     * read the original: the moved resolver must locate the subject INSIDE the copy (a proof that could not fail otherwise). */
    const movedDir = lookupSubject(moved.roots, s.id).dir;
    assert.ok(String(movedDir).replace(/\\/g, "/").startsWith(copy.replace(/\\/g, "/")), "the relocated declaration was not what resolved — onboarding worked only from the original location");
    const there = identityRows(moved, subjectsUnderProof(moved).find((x) => x.id === s.id) ?? s);
    assert.deepEqual(there, here, "the relocated root resolved different identities");
    /* SENSITIVITY — a match proves nothing unless the fingerprint CAN differ. Two relocated copies, each with ONE declaration
     * edited, must each resolve to a different digest: (1) the research batch re-attached to another active tenant (the
     * declaration changed); (2) the subject's connectors removed (the set of resolved identities changed). */
    const digest = (rows) => sha(rows.join("\n")).slice(0, 16);
    const edited = (edit) => {
      const c = mkdtempSync(join(tmpdir(), "f09-sensitivity-"));
      try {
        cpSync(external.path, c, { recursive: true, filter: (p) => !/[\\/]\.git([\\/]|$)/.test(p) });
        edit(c);
        const r2 = createTenantResolver({ env: { ...process.env, [SUBJECT_ROOTS_ENV]: c } });
        assert.ok(String(lookupSubject(r2.roots, s.id).dir).replace(/\\/g, "/").startsWith(c.replace(/\\/g, "/")), "CONTROL: the edited copy was not what resolved");
        return identityRows(r2, subjectsUnderProof(r2).find((x) => x.id === s.id) ?? s);
      } finally { rmSync(c, { recursive: true, force: true }); }
    };
    const rewrite = (file, fn) => { const j = JSON.parse(readFileSync(file, "utf8")); fn(j); writeFileSync(file, JSON.stringify(j, null, 2)); };
    const tenantNow = resolveSide(R, RESOURCES.subject(s.id)).tenantId;
    const otherTenant = R.declarations.tenants.find((t) => t.status === "ACTIVE" && t.tenantId !== tenantNow).tenantId;
    const batchMoved = edited((c) => rewrite(join(c, "tenancy", "attachments.json"), (j) => {
      const hit = j.attachments.filter((a) => a.resourceKind === "RESEARCH_BATCH" && a.resourceRef === s.batch);
      assert.equal(hit.length, 1, "CONTROL: the batch attachment to edit was not found exactly once");
      hit[0].tenantId = otherTenant;
    }));
    const connectorsGone = edited((c) => rewrite(join(c, "roots.json"), (j) => {
      const hit = j.subjects.filter((x) => x.subjectId === s.id || x.id === s.id);
      assert.equal(hit.length, 1, "CONTROL: the subject's roots entry to edit was not found exactly once");
      assert.ok((hit[0].connectors ?? []).length >= 1, "CONTROL: the subject declares no connector to remove");
      hit[0].connectors = [];
    }));
    assert.notEqual(digest(batchMoved), digest(here), "SENSITIVITY: re-attaching the batch to another tenant did not change the fingerprint — a constant dressed as a measurement");
    assert.notEqual(digest(connectorsGone), digest(here), "SENSITIVITY: removing the subject's connectors did not change the fingerprint — a constant dressed as a measurement");
    assert.equal(batchMoved.length, here.length, "the batch control must change an OUTCOME, not the row count");
    assert.ok(connectorsGone.length < here.length, "the connector control must shrink the resolved identity set");
    console.log(`F09-PORTABILITY-FINGERPRINT ${JSON.stringify({ platform: process.platform, rows: here.length, digest: digest(here), relocated: true, sensitivity: { batchReattached: digest(batchMoved), connectorsRemoved: digest(connectorsGone), rowsAfterConnectorsRemoved: connectorsGone.length } })}`);
  } finally { rmSync(copy, { recursive: true, force: true }); }
});

test("F09 · EVIDENCE · zero shared-engine specialisation: the subject's declared vocabulary appears nowhere in shared src/, bin/, config/ or generic tests — CONTROL: a planted breach is SEEN", async () => {
  const { neutralityCensus } = await import("../tools/product-boundary.mjs");
  const pkgs = await loadAllSubjectPackages();
  const s = one();
  const pkg = pkgs.find((p) => p.subjectId === s.id);
  assert.ok(pkg && pkg.vocabulary.length > 0, "the subject declares no vocabulary for the census to police");
  const words = pkg.vocabulary.map((w) => w.toLowerCase());
  // shared src/ bin/ config/ — the production neutrality census, whose vocabulary is the union of every package's
  const real = await neutralityCensus({ repo: REPO });
  assert.ok(real.files.length > 0);
  assert.deepEqual(real.breaches.filter((x) => words.some((w) => String(x.word).toLowerCase().includes(w))).map((x) => `${x.file}:${x.line}`), [], "shared engine code names the subject");
  // generic tests — clarification 10 names them too; the production census does not scan them, so this does
  const tests = execFileSync("git", ["-C", REPO, "ls-files", "test"], { encoding: "utf8" }).split("\n").filter((p) => p && !p.startsWith("test/fixtures/"));
  assert.ok(tests.length >= 100, `the generic-test population is ${tests.length} — an empty scan cannot prove absence`);
  const namesSubject = (x) => words.some((w) => x.toLowerCase().includes(w));
  const inTests = tests.filter((p) => namesSubject(readFileSync(join(REPO, p), "utf8")));
  assert.deepEqual(inTests, [], "a generic test names the subject");
  assert.ok(namesSubject(`${readFileSync(join(REPO, tests[0]), "utf8")}
// ${pkg.vocabulary[0]}
`), "CONTROL: the generic-test scan did not see the subject's word planted in a test");
  // CONTROL: the same census SEES the subject's word planted in a real shared file
  const planted = await neutralityCensus({ repo: REPO, read: (p) => (p === "bin/crawl.mjs" ? `${readFileSync(join(REPO, p), "utf8")}\nconst h = "x.${pkg.vocabulary[0]}.example";\n` : readFileSync(join(REPO, p), "utf8")) });
  assert.ok(planted.breaches.some((x) => x.file === "bin/crawl.mjs" && words.some((w) => String(x.word).toLowerCase().includes(w))), "CONTROL: a planted breach was not seen");
});

test("F09 · ACCEPTANCE · pinned from its committed blob, CURRENT, contract d0c8bd96…", () => {
  const a = ACCEPTANCES.F09;
  assert.equal(a.contractSha256, "d0c8bd96fcba46e712955379fa06e39cbd84186c7af8340adad90aa6fa535027");
  assert.equal(a.ruling.sha256, "5b85d04ef632bd0fc24e14bac39d24bacfe3cf85d40ce0fc32e18c7130468f74");
  const rec = AUTHORITY_CORPUS.find((r) => r.propositionId === "F09_ACCEPTANCE");
  assert.equal(rec?.status, "CURRENT");
  assert.equal(rec.contentHash, a.ruling.sha256);
});
