/**
 * 🔴 F02 · A DECLARED FIXTURE WORLD — so a safety proof that spawns an entry point can run PAST the tenant gate.
 *
 * Since F02 every production entry point decides the tenant of what it reads before it reads it, and there is no default
 * tenant. A test that spawns `node bin/x.mjs` with no `--tenant` is therefore refused at the gate (exit 3), and its real
 * subject — a write gate, a confinement gate, a dry run — is never reached. A safety proof that cannot run is not a
 * passing safety proof (owner decision, 24 Sep 2026).
 *
 * This builds a DISPOSABLE external root: a copy of the products' data root (its bytes are only read), with its tenancy
 * declarations REPLACED by one fixture tenant to which the resources the entry points name are attached, explicitly and
 * by name. 🔴 It is NOT the real population: the real declarations stay where they are, untouched, and the fixture
 * tenant's declarationBasis says so. Nothing here widens the gate — every attachment is on a literal list below, or is an
 * operator path the TEST itself hands to the run; a resource on neither is refused in the fixture world as in the real one.
 *
 *   const WORLD = declaredWorld();
 *   spawnSync(process.execPath, ["bin/x.mjs", ...WORLD.argv(["--corpus=.test-scratch/c"])], { env: WORLD.envWith() });
 *   after(() => WORLD.cleanup());
 *
 * Writes: a directory under the OS temp dir (removed by cleanup). Nothing in either repository.
 */
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, relative, sep, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

export const ENGINE = resolve(fileURLToPath(new URL("../../", import.meta.url)));
export const DATA_ROOT = resolve(ENGINE, "..", "almi-visibility-data");
export const FIXTURE_TENANT = "tenant:00000000000000000000000000000f02";
/** A SECOND fixture tenant, only when a test asks for one (secondTenantOrigins) — to prove a failure branch a one-tenant
 * world cannot tell apart (e.g. a run that reads or runs more than its own tenant). Never the real population. */
export const SECOND_FIXTURE_TENANT = "tenant:00000000000000000000000000000f03";
export const SUBJECT_ROOTS_ENV = "ALMIVISIBILITY_SUBJECT_ROOTS";
const BASIS = "F02_DECLARED_FIXTURE_WORLD_NOT_THE_REAL_POPULATION";

/**
 * 🔴 F03 · THE FIXTURE WORLD'S ROOT REGISTRY — one NEUTRAL fixture subject whose connectors reach only fixture resources, so
 * a safety proof on a LIVE path (a crawl, a Search Console ingest) can run past the connector decision to the gate it is
 * about. Its credential is NAMED, never held — the variable a test plants a key-file path in. The world's registry keeps
 * the copied data root's own subjects and stores (when it declares them) and declares the four stores the root holds.
 */
export const FIXTURE_SUBJECT = "fixture-world-subject";
export const FIXTURE_SUBJECT_ORIGIN = "https://fixture-world.invalid";
export const FIXTURE_SUBJECT_REGISTRY = `${FIXTURE_SUBJECT}/facts`;
export const FIXTURE_CREDENTIAL_NAME = "GSC_SERVICE_ACCOUNT_KEY_FILE";
const WORLD_STORES = Object.freeze([["PROJECT_DECLARATIONS", "declarations"], ["OBSERVATIONS", "observations"], ["CAPTURES", "captures"], ["RESEARCH", "research"]]);
const FIXTURE_SUBJECT_ENTRY = Object.freeze({
  subjectId: FIXTURE_SUBJECT,
  path: FIXTURE_SUBJECT,
  members: [{ resourceKind: "FACT_REGISTRY", resourceRef: FIXTURE_SUBJECT_REGISTRY }],
  connectors: [
    { connectorId: "site", kind: "PUBLIC_SITE", credential: null, reaches: [{ resourceKind: "SITE_ORIGIN", resourceRef: FIXTURE_SUBJECT_ORIGIN }] },
    { connectorId: "sources", kind: "CITED_SOURCES", credential: null, reaches: [{ resourceKind: "FACT_REGISTRY", resourceRef: FIXTURE_SUBJECT_REGISTRY }] },
    { connectorId: "search", kind: "SEARCH_CONSOLE_API", credential: { mechanism: "ENV_REFERENCE", name: FIXTURE_CREDENTIAL_NAME }, reaches: [{ resourceKind: "SITE_ORIGIN", resourceRef: FIXTURE_SUBJECT_ORIGIN }] },
  ],
});

/** Every store-set, ledger, cache and capture an entry point names (src/tenancy/scoped-run.mjs RESOURCES), by ref. */
export const FIXTURE_ATTACHMENTS = Object.freeze([
  ["EVIDENCE_STORE", "evidence-store"],
  ["COST_LEDGER", "cost-ledger"],
  ["CAPTURE_SET", "row25-2026-09-21"],
  ["CACHE_STORE", "sibling-page cache"],
  ["CACHE_STORE", "robots cache"],
  ["CACHE_STORE", "fact cache"],
  ...[
    "run stores", "sibling pages read from the cache directory", "audit finding stores", "verification issue store",
    "technical findings store", "stored source-integrity result", "stored discovery results", "source-integrity stores",
    "replay corpus", "render store", "recommendation and finding stores", "live sibling pages", "instrument findings",
    "crawl store", "crawl store and seed inputs", "audit findings", "Actions run timings",
  ].map((r) => ["RUN_STORE", r]),
  /* the two shared collections — in a ONE-tenant fixture world every member resolves to the fixture tenant (rule 3 holds
   * inside the fixture); the real declarations no longer attach them whole (owner ruling 1145012, Decision 2) */
  ["CRAWL_BATCH", "crawl-2026-09-12"],
  ["SITEMAP_COLLECTION", "sitemap-2026-09-12"],
  /* the engine's own neutral test products (engine-fixtures root) */
  ["FACT_REGISTRY", "engine-fixtures:neutral-test-knots/facts"],
  ["FACT_REGISTRY", "engine-fixtures:neutral-test-ferments/facts"],
  /* F03: the fixture world's neutral subject — its member and the one origin its connectors reach */
  ["FACT_REGISTRY", "fixture-world-subject/facts"],
  ["SITE_ORIGIN", "https://fixture-world.invalid"],
]);

/** The operator flags whose value is a path the run reads (the RESOURCES.inputPath call sites). */
export const INPUT_FLAGS = Object.freeze(["corpus", "store", "source", "spec", "csv", "bundle", "facts", "evidence", "robots", "audit", "crawl-dir", "crawl", "seeds", "sitemap", "seeds-from-evidence", "expect", "registry"]);
const KEYWORD_BUNDLES = new Set(["discover", "subject", "observed-pages", "sitemap"]);

/** An INPUT_PATH ref exactly as src/tenancy/scoped-run.mjs forms it, for an entry point spawned with cwd = the engine. */
export function inputPathRef(p) {
  const abs = resolve(ENGINE, p);
  const rel = relative(ENGINE, abs);
  return (rel !== "" && !rel.startsWith("..") && !isAbsolute(rel) ? rel : abs).split(sep).join("/");
}

export function declaredWorld({ inputPaths = [], extra = [], secondTenantOrigins = [] } = {}) {
  const second = new Set(secondTenantOrigins);
  if (!existsSync(join(DATA_ROOT, "tenancy", "attachments.json"))) throw new Error(`declaredWorld: no data root at ${DATA_ROOT}`);
  const root = mkdtempSync(join(tmpdir(), "almi-f02-world-"));
  cpSync(DATA_ROOT, root, { recursive: true, filter: (src) => !src.split(sep).includes(".git") });
  /* F03: the world's root registry (see FIXTURE_SUBJECT above) */
  const regPath = join(root, "roots.json");
  const realReg = existsSync(regPath) ? JSON.parse(readFileSync(regPath, "utf8")) : null;
  for (const [, dir] of WORLD_STORES) mkdirSync(join(root, dir), { recursive: true });
  mkdirSync(join(root, FIXTURE_SUBJECT, "facts"), { recursive: true });
  writeFileSync(regPath, JSON.stringify({
    schemaVersion: 1,
    kind: "ROOT_REGISTRY",
    stores: realReg?.stores ?? WORLD_STORES.map(([store, path]) => ({ store, path })),
    subjects: [...(realReg?.subjects ?? []), FIXTURE_SUBJECT_ENTRY],
  }, null, 2) + "\n");
  const real = JSON.parse(readFileSync(join(DATA_ROOT, "tenancy", "attachments.json"), "utf8")).attachments;
  const pairs = [];
  const seen = new Set();
  const add = (k, r) => { const key = `${k}\u0000${r}`; if (!seen.has(key)) { seen.add(key); pairs.push([k, r]); return true; } return false; };
  for (const [k, r] of [...real.map((a) => [a.resourceKind, a.resourceRef]), ...FIXTURE_ATTACHMENTS, ...inputPaths.map((p) => ["INPUT_PATH", inputPathRef(p)]), ...extra]) add(k, r);
  const write = () => writeFileSync(join(root, "tenancy", "attachments.json"), JSON.stringify({
    schemaVersion: 1,
    attachments: pairs.map(([resourceKind, resourceRef]) => ({ schemaVersion: 1, resourceKind, resourceRef, tenantId: resourceKind === "SITE_ORIGIN" && second.has(resourceRef) ? SECOND_FIXTURE_TENANT : FIXTURE_TENANT, declaredOn: "2026-09-24", declarationBasis: BASIS })),
  }, null, 2) + "\n");
  writeFileSync(join(root, "tenancy", "tenants.json"), JSON.stringify({ schemaVersion: 1, tenants: [{ schemaVersion: 1, tenantId: FIXTURE_TENANT, status: "ACTIVE", declaredOn: "2026-09-24", declarationBasis: BASIS, label: "F02 fixture world — every fixture resource, one tenant" }, ...(second.size ? [{ schemaVersion: 1, tenantId: SECOND_FIXTURE_TENANT, status: "ACTIVE", declaredOn: "2026-09-24", declarationBasis: BASIS, label: "F02 fixture world — a second tenant, for a failure branch" }] : [])] }, null, 2) + "\n");
  write();
  return Object.freeze({
    root,
    tenantId: FIXTURE_TENANT,
    tenantArg: `--tenant=${FIXTURE_TENANT}`,
    /** F03: the neutral fixture subject a live-path proof names (--subject=…) so it can run past the connector decision. */
    subject: FIXTURE_SUBJECT,
    subjectArg: `--subject=${FIXTURE_SUBJECT}`,
    /** Declare, to the fixture tenant, every input path THESE args hand the run; return the args with the tenant added. */
    argv(args = []) {
      let grew = false;
      for (const a of args) {
        const m = typeof a === "string" ? a.match(/^--([a-z-]+)=(.+)$/) : null;
        if (m && INPUT_FLAGS.includes(m[1]) && !(m[1] === "bundle" && KEYWORD_BUNDLES.has(m[2]))) grew = add("INPUT_PATH", inputPathRef(m[2])) || grew;
      }
      if (grew) write();
      return [...args, `--tenant=${FIXTURE_TENANT}`];
    },
    envWith(base = process.env) { return { ...base, [SUBJECT_ROOTS_ENV]: root }; },
    declared: () => pairs.map(([k, r]) => `${k} ${r}`),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  });
}
