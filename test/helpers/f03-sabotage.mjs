/**
 * F03 · SABOTAGE — one deliberate defect per limb of the frozen acceptance's FAILURE clause (and per EXPECTED guarantee),
 * each aimed at the NAMED proof in test/f03-root-connector-registry.test.mjs that must turn RED for the intended reason,
 * restored byte-identically, the production trail hashed around the whole run (shared harness: test/helpers/f08-sabotage.mjs).
 *
 *   node test/helpers/f03-sabotage.mjs [--only=F3-S1,…] [--out=<file>]
 *
 * FAILURE limbs → sabotages:
 *   a root or connector created by a directory, a store by presence, a descriptor's own content ...... F3-S1, F3-S2, F3-S3
 *   subject data read, or a connector constructed, before resolution ................................ F3-S4, F3-S5, F3-S16
 *   a resolution that disagrees with, or reaches beyond, F02 ........................................ F3-S6, F3-S7, F3-S17
 *   a refusal without a reason, or carrying a private path ........................................... F3-S8, F3-S9
 *   a credential value held; a secret accepted into the registry .................................... F3-S10, F3-S11
 *   a resolution that bypasses the governed write path ................................................ F3-S12
 *   an environment-specific branch ...................................................................... F3-S13
 *   a subject's identity in shared code .................................................................. F3-S14
 *   useful subject-owned behaviour deleted ............................................................... F3-S15
 *   the declarations read are not their committed form .................................................. F3-S18
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runSabotages, renderEvidence } from "./f08-sabotage.mjs";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const T = "test/f03-root-connector-registry.test.mjs";
const REG = "src/tenancy/root-registry.mjs";
const SCOPE = "src/tenancy/scope.mjs";
const CONN = "src/tenancy/connectors.mjs";
const ROOTS = "src/subject-roots.mjs";
const CLI = "src/product-cli.mjs";
const INDEX_READ = `  return Object.freeze({ state: "READ", reason: null, rootId: null, detail: null, subjects, stores, registries: Object.freeze(registries) });`;
const INDEX_WITH_ROOTS = `  return Object.freeze({ state: "READ", reason: null, rootId: null, detail: null, subjects, stores, registries: Object.freeze(registries), roots });`;

export const F03_SABOTAGES = [
  { id: "F3-S1", what: "a directory holding a product.mjs is taken as a subject when no registry declares it (convention fallback)", test: T, named: "F03 · C1a ·",
    edits: [
      { file: REG, from: INDEX_READ, to: INDEX_WITH_ROOTS },
      { file: REG, from: "  return locate(index, index?.subjects, subjectId);\n}", to: "  const l = locate(index, index?.subjects, subjectId); if (l.state !== \"UNDECLARED\") return l;\n  for (const r of index?.roots ?? []) { const dir = join(r.path, subjectId); try { if (statSync(join(dir, \"product.mjs\")).isFile()) return answer(\"DECLARED\", \"FOUND_BY_CONVENTION\", { dir, entry: { subjectId, path: subjectId, members: [], connectors: [] }, rootId: r.id, rootKind: r.kind, rootPath: r.path }); } catch {} }\n  return l;\n}" },
    ],
    expect: /a present directory with a product\.mjs created a subject/ },

  { id: "F3-S2", what: "a store directory that merely exists is taken as the declared store (presence fallback)", test: T, named: "F03 · C1b ·",
    edits: [
      { file: REG, from: INDEX_READ, to: INDEX_WITH_ROOTS },
      { file: REG, from: "  return locate(index, index?.stores, store);\n}", to: "  const l = locate(index, index?.stores, store); if (l.state !== \"UNDECLARED\") return l;\n  for (const r of index?.roots ?? []) { const dir = join(r.path, store.toLowerCase()); try { if (statSync(dir).isDirectory()) return answer(\"DECLARED\", \"FOUND_BY_PRESENCE\", { dir, entry: { store, path: store.toLowerCase() }, rootId: r.id, rootKind: r.kind, rootPath: r.path }); } catch {} }\n  return l;\n}" },
    ],
    expect: /a present captures\/ directory created a store/ },

  { id: "F3-S3", what: "a descriptor's own content widens what the declaration says (the member check dropped)", file: CLI, test: T, named: "F03 · C1c ·",
    from: `    if (!members.some((m) => m.resourceKind === "FACT_REGISTRY" && m.resourceRef === ref)) {`,
    to: `    if (false && !members.some((m) => m.resourceKind === "FACT_REGISTRY" && m.resourceRef === ref)) {`,
    /* the child prints LOADED only when the descriptor was read past the member check — never the regex the assertion prints */
    expect: /\bLOADED\b/ },

  { id: "F3-S4", what: "a subject's module is read without a decision allowing its root", file: ROOTS, test: T, named: "F03 · C2a ·",
    from: `  if (!allowsSubject(opts.decision, id)) throw new SubjectRootRefused("SUBJECT_NOT_RESOLVED",`,
    to: `  if (false && !allowsSubject(opts.decision, id)) throw new SubjectRootRefused("SUBJECT_NOT_RESOLVED",`,
    expect: /Missing expected rejection/ },

  { id: "F3-S5", what: "a connector is constructed without the run's decision", file: CONN, test: T, named: "F03 · C2b ·",
    from: `  if (!decision) throw new ConnectorRefused("CONNECTOR_NOT_RESOLVED");`,
    to: `  if (false) throw new ConnectorRefused("CONNECTOR_NOT_RESOLVED");`,
    expect: /Missing expected exception/ },

  { id: "F3-S6", what: "a subject's members are not all decided — the first member alone decides its tenant", file: SCOPE, test: T, named: "F03 · C3d ·",
    from: `  for (const s of sides.slice(1)) if (!decideSides(sides[0], s).allowed)`,
    to: `  for (const s of sides.slice(0, 0)) if (!decideSides(sides[0], s).allowed)`,
    expect: /a subject whose members belong to two tenants was not refused AMBIGUOUS/ },

  { id: "F3-S7", what: "a connector's reach is not checked against its subject's tenant (reaches beyond F02)", file: SCOPE, test: T, named: "F03 · C3d ·",
    from: `  if (!decideSides(subject, reach).allowed) return { ...side, state: "AMBIGUOUS", reason: "REACH_AND_SUBJECT_DECLARED_TO_DIFFERENT_TENANTS", tenantId: null };`,
    to: `  if (false) return { ...side, state: "AMBIGUOUS", reason: "REACH_AND_SUBJECT_DECLARED_TO_DIFFERENT_TENANTS", tenantId: null };`,
    expect: /a connector reaching another tenant's resource was not refused/ },

  { id: "F3-S8", what: "a root refusal carries the roots' filesystem paths", file: ROOTS, test: T, named: "F03 · C4c ·",
    from: "is declared in more than one root registry — refused; a silent winner is how a stale copy gets read`);",
    to: "is declared in more than one root registry — refused; a silent winner is how a stale copy gets read: ${roots.map((r) => r.path).join(\" and \")}`);",
    expect: /a refusal carried a private path/ },

  { id: "F3-S9", what: "a refusal carries prose instead of a machine-readable reason", file: SCOPE, test: T, named: "F03 · C4a ·",
    from: "const lookupSide = (side, l, prefix) => ({ ...side, state: LOOKUP_SIDE[l.state] ?? \"UNKNOWN\", reason: `${prefix}_${l.reason}`, tenantId: null });",
    to: "const lookupSide = (side, l, prefix) => ({ ...side, state: LOOKUP_SIDE[l.state] ?? \"UNKNOWN\", reason: `the ${prefix.toLowerCase()} could not be resolved`, tenantId: null });",
    expect: /refused without a machine-readable reason/ },

  { id: "F3-S10", what: "a secret-shaped value is accepted into the registry (the secret firewall skipped)", file: REG, test: T, named: "F03 · C5a ·",
    from: "  for (const f of findSecrets(doc)) no(`SECRET_SHAPED_VALUE:${f.detector}`, f.path);",
    to: "  for (const f of []) no(`SECRET_SHAPED_VALUE:${f.detector}`, f.path);",
    expect: /a secret-shaped value was accepted into the registry/ },

  { id: "F3-S11", what: "an opened connector carries its credential's VALUE", file: CONN, test: T, named: "F03 · C5b ·",
    from: "    credentialName,\n    fetch: (url, init) => globalThis.fetch(url, init),",
    to: "    credentialName,\n    credential: credentialName ? globalThis[\"pro\" + \"cess\"].env[credentialName] : null,\n    fetch: (url, init) => globalThis.fetch(url, init),",
    expect: /the connector carried the credential's value/ },

  { id: "F3-S12", what: "an allowed resolution is not recorded through the governed guard sink", file: "src/governance/scoped-entry.mjs", test: T, named: "F03 · C6a ·",
    from: "  if (run.allowed) for (const d of run.decisions) if (RECORDED_RESOLUTION_KINDS[d.decision.target?.resourceKind]) sink.emit(scopeResolutionEvent(d.decision));",
    to: "  if (false) for (const d of run.decisions) if (RECORDED_RESOLUTION_KINDS[d.decision.target?.resourceKind]) sink.emit(scopeResolutionEvent(d.decision));",
    expect: /the resolutions were not each recorded durably, once/ },

  { id: "F3-S13", what: "the resolution branches on its environment", file: REG, test: T, named: "F03 · C7b ·",
    from: `  const dir = join(root.path, ...entry.path.split("/"));`,
    to: `  const dir = process.platform === "win32" ? join(root.path, ...entry.path.split("/")) : join(root.path, entry.path);`,
    expect: /branches on its environment/ },

  { id: "F3-S14", what: "a subject's identity enters the shared resolution code", file: REG, test: T, named: "F03 · C8 ·",
    from: `export const REGISTRY_FILE = "roots.json";`,
    to: `export const REGISTRY_FILE = "roots.json";\nexport const KNOWN_SUBJECT = "almi-oet";`,
    expect: /names a subject identity from the registry/ },

  { id: "F3-S15", what: "a runnable entry point loses its connector (it now asks for one its subject does not declare)", file: "bin/quote-match.mjs", test: T, named: "F03 · C9 ·",
    /* RR-244 (restated): RR-243 named the run's own cost ledger after the connector, so the span moved; the sabotage is the same */
    from: `RESOURCES.connector(PRODUCT_ID, "CITED_SOURCES"), RESOURCES.costLedger(ownLedgerRef())] });`,
    to: `RESOURCES.connector(PRODUCT_ID, "SEARCH_CONSOLE_API"), RESOURCES.costLedger(ownLedgerRef())] });`,
    expect: /no longer resolves — behaviour was lost/ },

  { id: "F3-S16", what: "an entry point reaches the network without a connector (a bare fetch)", file: "bin/facts.mjs", test: T, named: "F03 · C2c ·",
    from: `const PRODUCT = await productFromArgvOrExit(process.argv, { usage: "node bin/facts.mjs <census|validate> --product=<id>", scope: SCOPE });`,
    to: `const PRODUCT = await productFromArgvOrExit(process.argv, { usage: "node bin/facts.mjs <census|validate> --product=<id>", scope: SCOPE }); const probeFetch = () => fetch("https://example.invalid/");`,
    expect: /a site constructs, reads or locates without resolving first/ },

  { id: "F3-S17", what: "the subject decision ignores its declared members (a second rule, disagreeing with F02)", file: SCOPE, test: T, named: "F03 · C3a ·",
    from: `  return oneTenantOf(resolve, l.entry.members, side, { prefix: "MEMBER", empty: "SUBJECT_DECLARES_NO_MEMBER" });`,
    to: `  return oneTenantOf(resolve, [], side, { prefix: "MEMBER", empty: "SUBJECT_DECLARES_NO_MEMBER" });`,
    expect: /disagrees with F02 over its members/ },

  { id: "F3-S18", what: "the registry bytes the index holds are not the committed bytes", file: REG, test: T, named: "F03 · C1f ·",
    from: `    try { bytes = readFileSync(file); doc = JSON.parse(bytes.toString("utf8")); } catch { return unknown("REGISTRY_UNREADABLE", root.id); }`,
    to: `    try { bytes = Buffer.concat([readFileSync(file), Buffer.from(" ")]); doc = JSON.parse(bytes.toString("utf8")); } catch { return unknown("REGISTRY_UNREADABLE", root.id); }`,
    expect: /registry read differs from its committed form/ },
];

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
  const outArg = (process.argv.find((a) => a.startsWith("--out=")) ?? "").slice(6);
  const list = only.length ? F03_SABOTAGES.filter((s) => only.includes(s.id)) : F03_SABOTAGES;
  console.log("F03 · SABOTAGE — landed · named test RED · intended reason · restored by raw-byte hash\n");
  const run = runSabotages(list);
  const executed = run.results.filter((r) => !String(r.verdict).startsWith("NOT RUN")).length;
  const bad = run.results.filter((r) => !(r.verdict === "RED, named test, intended reason" && r.restoredClean)).length;
  console.log(`\n${run.results.length} sabotage(s) · EXECUTED ${executed} of ${list.length} · ${run.results.length - bad} proved · ${bad} NOT proved · residue ${run.residue.length} · production untouched ${run.productionUntouched}`);
  if (outArg) {
    const head = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    writeFileSync(outArg.includes(":") || outArg.startsWith("/") ? outArg : join(REPO, outArg), renderEvidence(run, { title: "F03 SABOTAGE EVIDENCE — one defect per limb of the frozen acceptance", head }) + `\nEXECUTION ASSERTION: ${executed} of ${list.length} sabotages executed.\n`);
    console.log(`evidence written: ${outArg}`);
  }
  process.exit(bad === 0 && executed === list.length && run.residue.length === 0 && run.productionUntouched ? 0 : 1);
}
