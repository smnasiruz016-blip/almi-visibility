#!/usr/bin/env node
/**
 * 🔴 F02 · EVERY PRODUCTION ENTRY POINT THAT READS TENANT-GOVERNED DATA — AND WHETHER ITS SCOPE IS DECIDED FIRST.
 *
 *   node tools/tenant-scope-census.mjs [--check] [--table]
 *
 * READ-ONLY. The population is every bin/*.mjs. A FAMILY LOAD is a call of a loader primitive, a reference to a
 * governed store's location, or a call of a src/ function that itself reaches one — derived to a fixed point over src/,
 * never listed from memory (the F08 writer derivation's rule, applied to reads).
 *
 *   SCOPED              it calls scopedEntryPoint/requireScopedRun/decideScopedRun (src/governance/scoped-entry.mjs) on a line BEFORE its
 *                       first family load, and names a resource for EVERY family it loads
 *   UNSCOPED            a family load with no gate, a gate after the first load, or a family with no named resource
 *                       — 🔴 a BYPASS; --check exits 1
 *   NOT_TENANT_GOVERNED it loads no family at all (a positive control shows the same rule finding real loads)
 *   EXCLUDED            a function outside F02 by a NAMED reason with a NAMED control (EXCLUSIONS below) — the entry
 *                       point stays in the denominator and is reported by its reason; the exclusion covers only that
 *                       function, never the entry point's other loads
 *
 * The denominator is fixed: SCOPED + UNSCOPED + NOT_TENANT_GOVERNED + EXCLUDED = entry points, remainder 0.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { productionEntryPoints, isLibraryModule } from "../src/entry-points.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const git = (...a) => execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8", maxBuffer: 1 << 28 });

/** The families, and what LOADS each — a primitive call or a store's location. */
export const FAMILIES = Object.freeze({
  /* F03 (25 Sep 2026): a SUBJECT decision names the facts family too — it resolves only when every fact registry the subject
   * declares as a member resolves to the run's tenant, and the descriptor may then claim no other (src/product-cli.mjs). */
  FACTS: { resource: "factRegistry|factRegistryAt|subject", re: /\bloadRegistry\(/ },
  OBSERVATIONS: { resource: "crawlBatch|collectionPartition", re: /\b(batchFile|readBodyArchive|batchJsonlFiles|declaredObservationSources|declaredObservationBatches|readBatchManifest|readTenantPartition|readPartitionBodies)\(/ },
  SITEMAPS: { resource: "sitemapCollection|collectionPartition", re: /["']sitemaps\.jsonl["']|\bsitemapCollectionRef\(/ },
  /* A store's location counts only as a WHOLE path literal or joined path segments — prose that mentions a path is not a
   * load (bin/checklist-boundaries.mjs quotes "runs/evidence" in a sentence of its generated text). */
  EVIDENCE: { resource: "evidenceStore", re: /["']evidence\.jsonl["']|["']robots\.jsonl["']|["']runs["']\s*,\s*["']evidence["']|["'`](\$\{\w+\})?\.?\/?runs\/evidence[^"'`\s]*["'`]/ },
  COST: { resource: "costLedger", re: /\bcreateCostLedger\(|["']ledger\.jsonl["']|["']actions-runs\.jsonl["']|["']runs["']\s*,\s*["']cost["']|["'`](\$\{\w+\})?\.?\/?runs\/cost[^"'`\s]*["'`]/ },
  READS: { resource: "runArtefacts|inputPath|siteOrigin", re: /(?!)/ },
  /* A STORED cache directory only (F02 post-merge, 24 Sep 2026). The fact cache is built in memory from the records the run
   * already loaded through its gated registry, and the robots cache in memory from live fetches the READS family governs:
   * neither is a store, and naming them as gated resources made three entry points refuse on a resource that does not exist. */
  CACHE: { resource: "cache", re: /\/_[a-z-]*-cache\b/ },
  /* F01's declaration store: every reader joins DECLARATIONS_DIR (src/intake/store.mjs). */
  /* F03: F01's store is named by RESOURCES.declarationStore (its partition, inside the declared PROJECT_DECLARATIONS store). */
  DECLARATIONS: { resource: "tenantPartition|declarationStore", re: /\bDECLARATIONS_DIR\b|\btenantsDir\(/ },
  /* F03 (25 Sep 2026): a store is now LOCATED through its root-registry declaration — lookupStore(index, "<STORE>") — and a
   * reader that does so loads that family exactly as a literal directory name did. Without the second alternative the
   * captures reader dropped out of this population (28 → 27), and the research reader had never been in it. */
  CAPTURES: { resource: "captures", re: /["']captures["']|\blookupStore\([^;\n]*["']CAPTURES["']/ },
  RESEARCH: { resource: "research|researchBatch", re: /["']research["']|\blookupStore\([^;\n]*["']RESEARCH["']/ },
  /* RR-170 (5 Oct 2026): a SUBJECT'S OWN DATA ROOT — its descriptor and declared files, located through the root registry as `subject.dir`.
   * RESOURCES.subject decides it "BEFORE any of the subject's files is read" (src/tenancy/scoped-run.mjs); before this family, such a read
   * fell to READS, which only an unrelated resource could satisfy. A subject-root read now needs RESOURCES.subject, and nothing else does. */
  SUBJECT_ROOT: { resource: "subject", re: /\bsubject\.dir\b/ },
});

/**
 * 🔴 FAIL CLOSED: ANY OTHER DATA READ IS TENANT-GOVERNED UNTIL PROVED GLOBAL.
 *
 * The family patterns above leaked on their first run — the audit-findings stores, page corpora in operator-chosen
 * directories, live page fetches and a connected product's files were all read by entry points the patterns called
 * NOT_TENANT_GOVERNED. So a read is now any call of a read primitive, and it is GLOBAL only when its line names a
 * GLOBAL target: engine configuration, the engine's own source, governance records, the audit trail, or git objects.
 * Everything else — run artefacts, external roots, operator paths, the network — is the READS family, and needs a
 * named resource (runArtefacts / inputPath) like any other.
 */
export const READ_PRIMITIVE = /\b(readFileSync|readdirSync|createJsonlStore|fetch|readTree|readArchivedPages|readBodyArchive|statSync)\(/;
export const GLOBAL_TARGET = /\.mjs["'`]\)|endsWith\(["']\.mjs["']\)|config\/|["']config["']|AUTHORITY_CORPUS|CORPUS_PROVENANCE|_handoffs|governance-?[Rr]oot|govRoot|audit-trail|AUDIT_STORE|["'](bin|src|test|tools)["']|\bREPO\s*,\s*["'](bin|src|test|tools)|import\.meta\.url|package\.json|\.github|CHECKLIST_|PASS_BOUNDARIES|KEY_FEATURE_CHECKLIST|\bgit\(|execFileSync\(\s*["']git/;

/**
 * 🔴 EXCLUSIONS — FUNCTIONS, NOT ENTRY POINTS, EACH WITH ITS REASON AND ITS CONTROL.
 * A call of one of these is not counted as a family load. Nothing else is excused.
 */
export const EXCLUSIONS = Object.freeze([
  Object.freeze({
    fn: "derivedForbiddenSubstrings", module: "src/audit-trail/wiring.mjs",
    why: "GLOBAL_PRODUCT protection: it re-derives the protected held-out payload so the audit store can REFUSE it. Its only output is a refusal list; it joins no tenant and informs no tenant decision",
    control: "test/f02-tenant-scope.test.mjs F02-EXCL-1: the substrings only ever narrow what an append accepts",
  }),
  Object.freeze({
    fn: "captureSetMembers", module: "src/tenancy/attachment-declaration.mjs",
    why: "the attachment proof itself: it reads ONLY a capture manifest's recorded page URL and origin — never a page body — so each identity can be decided against the requested tenant by the one decision before any attachment is written",
    control: "test/f02-real-prerequisites.test.mjs: a capture whose members resolve to another tenant, or to none, is refused",
  }),
  ...["memberOrigins", "batchPageUrls", "sitemapListedUrls"].map((fn) => Object.freeze({
    fn, module: "src/tenancy/scoped-run.mjs",
    why: "the gate itself: it reads a container's member IDENTITY fields (a page's canonical URL, a listed URL) — never a body — so the one decision can refuse a container whose members are declared to another tenant",
    control: "test/f02-tenant-scope.test.mjs F02-EXCL-3: the member read returns origins only, and the decision it feeds refuses the real batch as AMBIGUOUS",
  })),
]);

/**
 * 🔴 EXCLUDED ENTRY POINTS — GLOBAL_PRODUCT GOVERNANCE, EACH WITH ITS REASON AND ITS CONTROL.
 *
 * Each reads only the engine's own source and configuration, governance records, the audit trail or git objects — or,
 * for the two held-out entry points, derives protected payload solely in order to REFUSE it. None joins, reports on or
 * decides anything about a tenant's resources. Each stays in the denominator, reported by its reason; the control is a
 * test that measures its reads (test/f02-tenant-scope.test.mjs, F02-EXCL-*).
 */
export const EXCLUDED_ENTRY_POINTS = Object.freeze({
  "bin/audit-trail.mjs": "the F08 recorder: governance records and the audit trail; its scope resolutions go through the resolver and are themselves audit events",
  "bin/authority-migrate.mjs": "the authority corpus migration: committed governance bytes via git, and its own generated config",
  "bin/authority-resolve.mjs": "the authority register: resolves over the committed corpus in config",
  "bin/fboard-crosswalk.mjs": "the F-board crosswalk: config and the historical ledger's classification",
  "bin/fboard-derive.mjs": "the F-board capability list: the committed specification extract and its own generated config",
  "bin/fboard-status.mjs": "the F-board status: config only",
  "bin/checklist-boundaries.mjs": "the historical ledger's boundaries document: engine configuration and its own generated document",
  "bin/product-boundary.mjs": "the product-neutrality census: the engine's own source code",
  "bin/observation-guard.mjs": "the observation guard: git's own index of committed paths, so no real observation is committed to the engine",
  "bin/heldout-firewall.mjs": "the held-out firewall (F07): engine source plus the evidence store, read ONLY to derive the protected held-out payload it refuses",
  "bin/heldout-evaluation.mjs": "the held-out lifecycle (F07): the evidence-role registry in config and the audit trail",
  /* F10 (27 Sep 2026). NOT a claim that it reads no tenant data: it reads every ACTIVE tenant's rows — but each ONLY through F02's
   * one partition decision for THAT tenant (decidePartition → readTenantPartition), the C1 route bin/heldout-evaluation.mjs's
   * `score` already uses, and it selects within each tenant separately. Its control: test/f10-selection-packet.test.mjs. */
  "bin/f10-select.mjs": "the ONE governed F10 selection (C1/C3): each ACTIVE tenant's rows read only through F02's partition decision for that tenant, selected within that tenant alone, never joined across tenants; it writes only into storage S and one count-only seal record, through the governed-write boundary",
  /* Part D1 (28 Sep 2026). It reads the evidence-role registry, the audit trail and ONE marking key in storage S — a GLOBAL_PRODUCT
   * sealed role, not a tenant resource — after a durable, witness-checked ACCESS; it releases only a row count and a commitment, and
   * joins, reports on or decides nothing about any tenant. Its control: test/f10-key-registration.test.mjs. */
  "bin/f10-register-key.mjs": "the governed F10 key registration / pre-scoring key preflight (Part D1): the registry, the audit trail and one marking key in storage S read only after a durable witness-checked ACCESS; it releases a row count and a commitment and decides nothing about a tenant",
  /* F87 (RR-130 §2, owner decision 2 Oct 2026). NOT a claim that it reads no tenant data: it reads the engine's operational stores to
   * COUNT them, for the engine operator — a cross-tenant overview the owner permitted for running and repairing the engine. F04 decides
   * READ_OPERATIONS_OVERVIEW at GLOBAL_PRODUCT scope before any read; the crawl batch is attributed only by F02's own partition
   * arithmetic; it releases counts and state codes only (assertOverview), never a record or a tenant identifier; unscoped history stays
   * UNATTRIBUTED. Its control: test/f87-operator-overview.test.mjs (proofs 1–4 and the authorisation gate). */
  "bin/operations-overview.mjs": "the engine operator's cross-tenant operational overview (owner, RR-130 §2): F04-authorised at GLOBAL_PRODUCT scope before any read; counts and state codes only, never a record, URL, content or tenant identifier; unscoped history stays UNATTRIBUTED",
  "bin/approval.mjs": "the F04 approval registry: config/governance/approvals.jsonl and the committed authority corpus; it records an owner-issued approval and reads, joins or decides nothing about a tenant",
  "bin/retire-attachment.mjs": "the declaration source (F02, owner ruling 25 Sep): it removes one attachment PROVED unlawful by its own members' identity fields; it joins nothing, reads no body, and its write is F08-governed",
});

/**
 * 🔴 SUBMISSION INPUTS — the one read that may come BEFORE a gate, because it is the thing the gate decides about.
 * A submitted declaration carries its own tenant claim; that claim is decided (the declared partition, and the F01
 * contract through the one scope decision) before any governed store is read. Only this entry point's READS are
 * affected; its DECLARATIONS family is enforced like any other. Control: F02-EXCL-2.
 */
export const SUBMISSION_INPUTS = Object.freeze({
  "bin/project-intake.mjs": "the declaration submitted for decision (--file); its tenant is decided before the declaration store is read",
});

const isCode = (l) => !/^\s*(\/\/|\*|\/\*)/.test(l);
const codeLines = (text) => text.split("\n").map((l, i) => ({ line: i + 1, text: l })).filter((r) => isCode(r.text) && !/^\s*import\b/.test(r.text));

/** src/ functions that reach a family, to a fixed point. Returns name → Set(family). */
export function derivedFamilyReaders({ files = null, read = null } = {}) {
  const list = files ?? git("ls-files", "src", "subjects").split("\n").filter(isLibraryModule);
  const readText = read ?? ((f) => readFileSync(join(REPO, f), "utf8"));
  const fns = [];
  for (const file of list) {
    const t = readText(file).replace(/\r\n/g, "\n");
    /* `function name(` AND `const name = (…) =>` — a store reader written as an arrow constant (src/intake/store.mjs's
     * `tenantsDir`) was invisible to the first version of this derivation. */
    const hits = [...t.matchAll(/^(export )?(?:(?:async )?function (\w+)\s*\(|const (\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>)/gm)];
    hits.forEach((m, i) => fns.push({ file, name: m[2] ?? m[3], exported: Boolean(m[1]), body: t.slice(m.index, i + 1 < hits.length ? hits[i + 1].index : t.length) }));
  }
  const excluded = new Set(EXCLUSIONS.map((e) => e.fn));
  const reach = new Map();
  for (const f of fns) {
    if (excluded.has(f.name)) continue;
    const code = codeLines(f.body).map((r) => r.text).join("\n");
    const fams = Object.keys(FAMILIES).filter((k) => FAMILIES[k].re.test(code));
    if (fams.length) reach.set(`${f.file}#${f.name}`, new Set(fams));
  }
  for (let grew = true; grew;) {
    grew = false;
    const byName = new Map();
    for (const f of fns) if (reach.has(`${f.file}#${f.name}`)) { const s = byName.get(f.name) ?? new Set(); for (const x of reach.get(`${f.file}#${f.name}`)) s.add(x); byName.set(f.name, s); }
    for (const f of fns) {
      if (excluded.has(f.name)) continue;
      const code = codeLines(f.body.slice(f.body.indexOf("{"))).map((r) => r.text).join("\n");
      const key = `${f.file}#${f.name}`;
      const cur = reach.get(key) ?? new Set();
      const before = cur.size;
      for (const [n, s] of byName) if (n !== f.name && new RegExp(`\\b${n}\\(`).test(code)) for (const x of s) cur.add(x);
      if (cur.size > before) { reach.set(key, cur); grew = true; }
    }
  }
  const out = new Map();
  for (const f of fns) if (f.exported && reach.has(`${f.file}#${f.name}`)) {
    const s = out.get(f.name) ?? new Set();
    for (const x of reach.get(`${f.file}#${f.name}`)) s.add(x);
    out.set(f.name, s);
  }
  return out;
}

const READERS = derivedFamilyReaders();
export const GATE = /\b(scopedEntryPoint|requireScopedRun|decideScopedRun)\(/;
/** A governed write helper; in a SCOPED entry point each must carry the run's write scope, so its output is the tenant's. */
const GOVERNED_WRITE_HELPER = /\b(governedFileWrite|governedStoreAppend|governedRecordAppend|governedDirectoryReplace)\(/;

/** One entry point, classified. */
export function classifyEntryPoint(file, text, readers = READERS) {
  const lines = codeLines(text.replace(/\r\n/g, "\n"));
  const loads = [];
  /* A constant bound on a family line (`const STORE = join(REPO, "runs", "evidence", …)`) carries that family to every
   * read made through it — so a read of STORE is the evidence store, not an unknown READS. */
  const boundFamily = new Map();
  for (const r of lines) {
    const before = loads.length;
    for (const [fam, def] of Object.entries(FAMILIES)) if (def.re.test(r.text)) loads.push({ line: r.line, family: fam, via: "primitive" });
    for (const [name, fams] of readers) if (new RegExp(`\\b${name}\\(`).test(r.text)) for (const fam of fams) loads.push({ line: r.line, family: fam, via: name });
    const bound = r.text.match(/^\s*(?:const|let)\s+(\w+)\s*=/);
    if (bound && loads.length > before) boundFamily.set(bound[1], loads[loads.length - 1].family);
    if (loads.length === before && READ_PRIMITIVE.test(r.text) && !GLOBAL_TARGET.test(r.text)) {
      const through = [...boundFamily].find(([id]) => new RegExp(`\\b${id}\\b`).test(r.text));
      loads.push({ line: r.line, family: through ? through[1] : "READS", via: through ? `read through ${through[0]}` : r.text.match(READ_PRIMITIVE)[1] });
    }
  }
  if (Object.hasOwn(SUBMISSION_INPUTS, file)) for (let k = loads.length - 1; k >= 0; k -= 1) if (loads[k].family === "READS") loads.splice(k, 1);
  const families = [...new Set(loads.map((l) => l.family))].sort();
  const gateAt = lines.find((r) => GATE.test(r.text))?.line ?? 0;
  const firstLoad = loads.length ? Math.min(...loads.map((l) => l.line)) : 0;
  const gateText = gateAt ? text.replace(/\r\n/g, "\n").split("\n").slice(gateAt - 1, gateAt + 40).join("\n") : "";
  /* `everySubjectRegistry()` names each subject's registry by its declared location (src/tenancy/scoped-run.mjs). */
  const namesFamily = (f, t) => new RegExp(`RESOURCES\\.(${FAMILIES[f].resource})\\(`).test(t) || (f === "FACTS" && /\beverySubjectRegistry\(/.test(t));
  const named = families.filter((f) => namesFamily(f, gateText) || namesFamily(f, text));
  const missing = families.filter((f) => !named.includes(f));
  if (Object.hasOwn(EXCLUDED_ENTRY_POINTS, file)) return { file, cls: "EXCLUDED", families, loads, gateAt, firstLoad, missing, why: EXCLUDED_ENTRY_POINTS[file] };
  if (families.length === 0) return { file, cls: "NOT_TENANT_GOVERNED", families, loads, gateAt, firstLoad, missing, why: "it loads no tenant-governed family" };
  if (!gateAt) return { file, cls: "UNSCOPED", families, loads, gateAt, firstLoad, missing, why: "family loads with no scoped-run gate" };
  if (gateAt > firstLoad) return { file, cls: "UNSCOPED", families, loads, gateAt, firstLoad, missing, why: `the gate (line ${gateAt}) comes after the first load (line ${firstLoad})` };
  if (missing.length) return { file, cls: "UNSCOPED", families, loads, gateAt, firstLoad, missing, why: `no resource named for ${missing.join(", ")}` };
  /* Every governed write of a scoped run carries its write scope — the call's text, to where its parentheses balance. */
  const all = text.replace(/\r\n/g, "\n");
  const unscopedWrites = [...all.matchAll(new RegExp(GOVERNED_WRITE_HELPER.source, "g"))].filter((m) => {
    let depth = 0; let end = m.index;
    for (let j = m.index; j < all.length; j += 1) { if (all[j] === "(") depth += 1; else if (all[j] === ")") { depth -= 1; if (depth === 0) { end = j; break; } } }
    return !/\.\.\.\s*\w+\.writeScope\b|scopeType:\s*["']TENANT["']/.test(all.slice(m.index, end));
  }).length;
  if (unscopedWrites) return { file, cls: "UNSCOPED", families, loads, gateAt, firstLoad, missing, why: `${unscopedWrites} governed write(s) do not carry the run's tenant write scope` };
  return { file, cls: "SCOPED", families, loads, gateAt, firstLoad, missing, why: "every family named, gate first" };
}

export const CLASSES = Object.freeze(["SCOPED", "UNSCOPED", "NOT_TENANT_GOVERNED", "EXCLUDED"]);

export function census({ sources = null } = {}) {
  /* F02 relocation: production entry points are bin/ AND every declared subject package's tools (src/entry-points.mjs). */
  const bins = sources ? sources.map((s) => s.file) : productionEntryPoints({ repo: REPO });
  return bins.map((file) => classifyEntryPoint(file, sources ? sources.find((s) => s.file === file).text : readFileSync(join(REPO, file), "utf8")));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const rows = census();
  const by = Object.fromEntries(CLASSES.map((c) => [c, rows.filter((r) => r.cls === c).length]));
  console.log(`TENANT SCOPE CENSUS — ${rows.length} production entry point(s) (bin/ and subject packages) · derived family readers in src/: ${READERS.size}`);
  for (const c of CLASSES) console.log(`  ${c.padEnd(20)} ${by[c]}`);
  console.log(`  ${"REMAINDER".padEnd(20)} ${rows.length - CLASSES.reduce((n, c) => n + by[c], 0)}`);
  for (const e of EXCLUSIONS) console.log(`  EXCLUDED FUNCTION ${e.module}#${e.fn} — ${e.why}`);
  for (const r of rows.filter((x) => x.cls === "UNSCOPED")) console.log(`  🔴 UNSCOPED ${r.file} [${r.families.join(",")}] — ${r.why}`);
  if (process.argv.includes("--table")) for (const r of rows) console.log(`  ${r.file.padEnd(36)} ${r.cls.padEnd(20)} ${r.families.join(",")}`);
  if (process.argv.includes("--check") && by.UNSCOPED) process.exit(1);
}
