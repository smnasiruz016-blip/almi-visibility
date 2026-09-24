/**
 * F01 · SABOTAGE — one independent defect per failure class of the frozen acceptance, each asserted to have RUN, to
 * have LANDED (bytes AND behaviour) and to turn its named proof RED for the intended reason, restored byte-identically
 * (24 September 2026). The harness is F08's (test/helpers/f08-sabotage.mjs), unchanged.
 *
 *   node test/helpers/f01-sabotage.mjs [--only=S1,…] [--out=runs/audit/<file>.txt]
 *
 * 🔴 A PROBE NEVER TOUCHES THE PRODUCTION TRAIL. Probes that run the binary give it a temporary world and a CONFINED
 * audit store (the test runner's own two signals, under a nonce this harness mints and then removes — nothing it did
 * not create). Module-level probes touch no store at all. The harness hashes the production trail around the run.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runSabotages, renderEvidence } from "./f08-sabotage.mjs";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const CONTRACT = "src/intake/contract.mjs";
const ORIGIN = "src/intake/origin.mjs";
const SECRETS = "src/intake/secrets.mjs";
const INTAKE = "src/intake/intake.mjs";
const STORE = "src/intake/store.mjs";
const BIN = "bin/project-intake.mjs";
const T = "test/f01-intake.test.mjs";

const PRELUDE = `
const u = (p) => new URL(p, "file:///" + process.cwd().replace(/\\\\/g, "/") + "/").href;
const fs = await import("node:fs"); const os = await import("node:os"); const path = await import("node:path"); const cp = await import("node:child_process"); const cr = await import("node:crypto");
const C = await import(u("${CONTRACT}")); const I = await import(u("${INTAKE}")); const O = await import(u("${ORIGIN}")); const X = await import(u("${SECRETS}"));
const say = (b) => console.log("DEFECT_TOOK_EFFECT:" + Boolean(b));
const N = JSON.parse(fs.readFileSync("test/fixtures/intake/neutral-third-declaration.json", "utf8"));
const TA = "tenant:" + "a1".repeat(16), TB = "tenant:" + "b2".repeat(16), TN = N.tenantId, TS = [TN, TA, TB];
const hex = () => cr.randomBytes(16).toString("hex");
const fresh = (t = TN, o = {}) => ({ ...JSON.parse(JSON.stringify(N)), tenantId: t, declarationId: "decl_" + hex(), ...o });
const worlds = [];
const world = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "f01-probe-")); worlds.push(d); fs.mkdirSync(path.join(d, "tenancy")); fs.writeFileSync(path.join(d, "tenancy", "tenants.json"), JSON.stringify({ schemaVersion: 1, tenants: TS.map((t) => ({ schemaVersion: 1, tenantId: t, status: "ACTIVE" })) })); fs.writeFileSync(path.join(d, "tenancy", "attachments.json"), JSON.stringify({ schemaVersion: 1, attachments: [] })); fs.mkdirSync(path.join(d, "declarations")); fs.writeFileSync(path.join(d, "declarations", "ROOT.json"), JSON.stringify({ schemaVersion: 1, kind: "PROJECT_DECLARATION_ROOT" })); return d; };
const NONCE = "f01probe-" + cr.randomBytes(4).toString("hex");
const RUNDIR = path.join(".test-scratch", "audit", "run-" + NONCE);
const events = () => { const p = path.join(RUNDIR, "worker-f01-probe", "events.jsonl"); return fs.existsSync(p) ? fs.readFileSync(p, "utf8").trim().split("\\n").filter(Boolean).map((l) => JSON.parse(l)) : []; };
process.on("exit", () => { for (const w of worlds) fs.rmSync(w, { recursive: true, force: true }); fs.rmSync(RUNDIR, { recursive: true, force: true }); });
const bin = (d, ...a) => { const r = cp.spawnSync(process.execPath, ["${BIN}", ...a, "--json"], { encoding: "utf8", env: { ...process.env, ALMIVISIBILITY_SUBJECT_ROOTS: d, NODE_TEST_CONTEXT: "child-v8", NODE_TEST_WORKER_ID: "f01-probe", ALMIVISIBILITY_AUDIT_RUN: NONCE } }); let j = null; try { j = JSON.parse(r.stdout.trim().split("\\n").pop()); } catch {} return { j, out: r.stdout + r.stderr }; };
const put = (d, doc) => { const p = path.join(d, "doc-" + hex() + ".json"); fs.writeFileSync(p, JSON.stringify(doc)); return p; };
const files = (d) => { const out = []; const walk = (x) => { for (const n of fs.readdirSync(x)) { const p = path.join(x, n); if (fs.statSync(p).isDirectory()) walk(p); else out.push(p); } }; walk(path.join(d, "declarations")); return out; };
`;
const probe = (body) => `${PRELUDE}\n${body}`;

export const F01_SABOTAGES = [
  { id: "S1", what: "an absent tenant DEFAULTS to a usual tenant", file: CONTRACT, test: T, named: "P5 ·",
    from: "  // 🔴 THE SECRET FIREWALL RUNS FIRST, OVER EVERYTHING — keys included — and a finding refuses the whole document.",
    to: "  if (doc.tenantId === undefined || doc.tenantId === null || doc.tenantId === \"\") doc = { ...doc, tenantId: tenants?.[0] };",
    probe: probe(`const d = fresh(); delete d.tenantId; say(C.validateDeclaration(d, { tenants: TS }).ok);`),
    expect: /was not refused — a usual tenant was supplied/ },

  { id: "S2", what: "one project allowed to cross tenants", file: INTAKE, test: T, named: "P7 ·",
    from: '  if (holders.some((h) => h !== n.tenantId)) return refuseStore("PROJECT_BELONGS_TO_ANOTHER_TENANT", "$.projectId");',
    to: '  if (false) return refuseStore("PROJECT_BELONGS_TO_ANOTHER_TENANT", "$.projectId");',
    probe: probe(`const d = world(); const a = fresh(TA); bin(d, "--submit", "--file", put(d, a), "--confirm"); say(bin(d, "--submit", "--file", put(d, fresh(TB, { projectId: a.projectId })), "--confirm").j?.outcome === "ACCEPTED");`),
    expect: /a project crossed tenants/ },

  { id: "S3", what: "an absent permission GRANTED", file: CONTRACT, test: T, named: "P23 ·",
    from: '      grantState: wanted ? "PENDING" : "DENIED",',
    to: '      grantState: wanted ? "PENDING" : "GRANTED",',
    probe: probe(`const d = fresh(); d.permissions = []; say(C.validateDeclaration(d, { tenants: TS }).normalised.permissions.some((p) => p.grantState === "GRANTED"));`),
    expect: /an absent permission was not DENIED — it was allowed/ },

  { id: "S4", what: "the environment INFERRED from the hostname", file: CONTRACT, test: T, named: "P20 ·",
    from: '    normalisedProperties.push({ ...pr, origin: o.origin,',
    to: '    normalisedProperties.push({ ...pr, environmentId: /staging/.test(o.origin) ? "staging" : pr.environmentId, origin: o.origin,',
    probe: probe(`const d = fresh(); d.properties = [{ ...d.properties[0], origin: "https://staging.probe.example", environmentId: "public-register" }]; say(C.validateDeclaration(d, { tenants: TS }).normalised.properties[0].environmentId !== "public-register");`),
    expect: /\+ 'staging'\s*\n\s*- 'public-register'/ },

  { id: "S5", what: "embedded credentials ACCEPTED in an origin", file: ORIGIN, test: T, named: "P17 ·",
    from: '  if (u.username !== "" || u.password !== "" || /^[a-z][a-z0-9+.-]*:\\/\\/[^/?#]*@/i.test(raw)) return refuse("ORIGIN_EMBEDDED_CREDENTIALS");',
    to: '  if (false) return refuse("ORIGIN_EMBEDDED_CREDENTIALS");',
    probe: probe(`say(O.normaliseOrigin("https://ringer@bells.probe.example").ok);`),
    expect: /an origin carrying a user was not refused/ },

  { id: "S6", what: "a value-shaped secret ACCEPTED", file: CONTRACT, test: T, named: "P28 ·",
    from: "  for (const f of findSecrets(doc)) no(`SECRET_SHAPED_VALUE:${f.detector}`, f.path);",
    to: "  for (const f of []) no(`SECRET_SHAPED_VALUE:${f.detector}`, f.path);",
    probe: probe(`const d = fresh(); d.goals[1].wording = "sk-F01PROBEplantedFAKEmarker0000000"; say(C.validateDeclaration(d, { tenants: TS }).ok);`),
    expect: /a secret-shaped value was accepted/ },

  { id: "S7", what: "the rejected secret value PRINTED (carried into the finding)", file: SECRETS, test: T, named: "P28 ·",
    from: "out.push(Object.freeze({ path: p, detector: d }))",
    to: "out.push(Object.freeze({ path: `${p}=${v}`, detector: d }))",
    probe: probe(`say(JSON.stringify(X.findSecrets({ x: "sk-F01PROBEplantedFAKEmarker0000000" })).includes("F01PROBE"));`),
    expect: /printed the secret or a fragment of it/ },

  { id: "S8", what: "an unknown schema version IGNORED", file: CONTRACT, test: T, named: "P3 ·",
    from: '  else if (doc.schemaVersion !== SCHEMA_VERSION) no("SCHEMA_VERSION_UNSUPPORTED", "$.schemaVersion");',
    to: '  else if (false) no("SCHEMA_VERSION_UNSUPPORTED", "$.schemaVersion");',
    probe: probe(`say(C.validateDeclaration(fresh(TN, { schemaVersion: 2 }), { tenants: TS }).ok);`),
    expect: /schema version 0 was not refused/ },

  { id: "S9", what: "an unknown top-level field IGNORED", file: CONTRACT, test: T, named: "P4 ·",
    from: '  for (const k of Object.keys(doc)) if (!TOP_LEVEL_FIELDS.includes(k)) no("UNKNOWN_FIELD", "$[top-level]");',
    to: '  for (const k of Object.keys(doc)) if (false) no("UNKNOWN_FIELD", "$[top-level]");',
    probe: probe(`say(C.validateDeclaration({ ...fresh(), extra: 1 }, { tenants: TS }).ok);`),
    expect: /-\s+'UNKNOWN_FIELD'/ },

  { id: "S10", what: "an ACCEPTED declaration MUTATED (same id, new bytes, written over it)", test: T, named: "P10 ·",
    edits: [
      { file: INTAKE, from: '    if (held.tenantId !== n.tenantId || held.projectId !== n.projectId || held.bytes !== bytes) return refuseStore("DECLARATION_ID_CONFLICT", "$.declarationId");', to: '    if (held.tenantId !== n.tenantId || held.projectId !== n.projectId) return refuseStore("DECLARATION_ID_CONFLICT", "$.declarationId");' },
      { file: INTAKE, from: "    if (current?.record.declarationId === n.declarationId || currentPointer(root, n.tenantId, n.projectId)?.declarationId === n.declarationId) {", to: "    if (held.bytes === bytes && (current?.record.declarationId === n.declarationId || currentPointer(root, n.tenantId, n.projectId)?.declarationId === n.declarationId)) {" },
      { file: INTAKE, from: '    if (n.supersedes === null) return refuseStore("SUPERSESSION_REQUIRED", "$.supersedes");', to: '    if (n.supersedes === null && current.record.declarationId !== n.declarationId) return refuseStore("SUPERSESSION_REQUIRED", "$.supersedes");' },
      { file: INTAKE, from: '    if (n.supersedes !== current.record.declarationId) return refuseStore("SUPERSEDES_NOT_CURRENT", "$.supersedes");', to: '    if (n.supersedes !== current.record.declarationId && current.record.declarationId !== n.declarationId) return refuseStore("SUPERSEDES_NOT_CURRENT", "$.supersedes");' },
    ],
    probe: probe(`const d = world(); const a = fresh(); bin(d, "--submit", "--file", put(d, a), "--confirm"); say(bin(d, "--submit", "--file", put(d, { ...a, displayName: "mutated" }), "--confirm").j?.outcome === "ACCEPTED");`),
    expect: /the same id with new bytes was accepted — an accepted declaration was rewritten/ },

  { id: "S11", what: "an update OVERWRITES the current view instead of superseding", test: T, named: "P12 ·",
    edits: [
      { file: INTAKE, from: '    if (n.supersedes === null) return refuseStore("SUPERSESSION_REQUIRED", "$.supersedes");', to: '    if (false) return refuseStore("SUPERSESSION_REQUIRED", "$.supersedes");' },
      { file: INTAKE, from: '    if (n.supersedes !== current.record.declarationId) return refuseStore("SUPERSEDES_NOT_CURRENT", "$.supersedes");', to: '    if (n.supersedes !== null && n.supersedes !== current.record.declarationId) return refuseStore("SUPERSEDES_NOT_CURRENT", "$.supersedes");' },
    ],
    probe: probe(`const d = world(); const a = fresh(); bin(d, "--submit", "--file", put(d, a), "--confirm"); say(bin(d, "--submit", "--file", put(d, fresh()), "--confirm").j?.outcome === "ACCEPTED");`),
    expect: /an update naming nothing it supersedes was accepted — history was overwritten/ },

  { id: "S12", what: "an idempotent replay DUPLICATED (written and recorded again)", test: T, named: "P9 ·",
    edits: [
      { file: INTAKE, from: "    if (current?.record.declarationId === n.declarationId || currentPointer(root, n.tenantId, n.projectId)?.declarationId === n.declarationId) {", to: "    if (false) {" },
      { file: INTAKE, from: "  if (current) {\n    if (n.supersedes === null)", to: "  if (current && current.record.declarationId !== n.declarationId) {\n    if (n.supersedes === null)" },
    ],
    probe: probe(`const d = world(); const p = put(d, fresh()); bin(d, "--submit", "--file", p, "--confirm"); say(bin(d, "--submit", "--file", p, "--confirm").j?.outcome === "ACCEPTED");`),
    expect: /\+\s+'ACCEPTED',\s*\n\s*-\s+'ALREADY_ACCEPTED'/ },

  { id: "S13", what: "inspection PERMITTED across tenants", file: STORE, test: T, named: "P37 ·",
    from: "  return listTenant(root, tenantId).find((h) => h.record.declarationId === declarationId) ?? null;",
    to: '  return dirs(tenantsDir(root)).flatMap((t) => listTenant(root, t.replace("-", ":"))).find((h) => h.record.declarationId === declarationId) ?? null;',
    probe: probe(`const d = world(); const a = fresh(TA); bin(d, "--submit", "--file", put(d, a), "--confirm"); say(bin(d, "--show", a.declarationId, "--tenant", TB).j?.outcome === "FOUND");`),
    expect: /a cross-tenant inspection returned another tenant's declaration/ },

  { id: "S14", what: "validate-only PERFORMS A WRITE", file: BIN, test: T, named: "P30 ·",
    from: '  exitWith(0, { outcome: "VALID", declarationId: v.normalised.declarationId,',
    to: '  { const root = resolveDeclarationRoot({ env: process.env }); if (root.ok) executeGovernedWrite(declarationWrite({ root, audit: governedContext({ repo: REPO, env: process.env, correlationId: "validate:sabotage", now: isoSeconds(Date.now()).slice(0, 10) }), permission: { mayWrite: true, reason: "sabotage" }, repoRelativeTarget: "declarations/validate-wrote.json", bytes: "{}", action: "WRITE_PROJECT_DECLARATION", tenantId: v.normalised.tenantId, occurredAt: isoSeconds(Date.now()) })); }\n  exitWith(0, { outcome: "VALID", declarationId: v.normalised.declarationId,',
    probe: probe(`const d = world(); bin(d, "--validate", "--file", put(d, fresh())); say(files(d).length > 1);`),
    expect: /validate-only wrote or recorded something/ },

  { id: "S15", what: "the F08 governed-write boundary BYPASSED (a direct filesystem write)", test: T, named: "P32 ·",
    edits: [
      { file: BIN, from: 'import { readFileSync, existsSync } from "node:fs";', to: 'import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";' },
      { file: BIN, from: "  const out = executeGovernedWrite(declarationWrite({ root, audit: writeAudit, permission, repoRelativeTarget: w.rel, bytes: w.bytes, action: w.action, tenantId: decision.normalised.tenantId, occurredAt: instant }));", to: '  const out = (() => { const p = root.base + "/" + w.rel; mkdirSync(p.slice(0, p.lastIndexOf("/")), { recursive: true }); writeFileSync(p, w.bytes); return { outcome: "COMMITTED" }; })();' },
    ],
    probe: probe(`const d = world(); const r = bin(d, "--submit", "--file", put(d, fresh()), "--confirm"); say(r.j?.outcome === "ACCEPTED" && events().filter((e) => e.eventType === "GOVERNED_WRITE").length === 0);`),
    expect: /-\s+'GOVERNED_WRITE_ATTEMPTED'/ },

  { id: "S16", what: "an audit transition DOUBLE-EMITTED", file: INTAKE, test: T, named: "P39 ·",
    from: "  return drafts.filter((d) => isDurableDecision(d)).map((d) => audit.store.append(d, { identity: decisionIdentity(d) }));",
    to: "  return drafts.filter((d) => isDurableDecision(d)).flatMap((d) => [audit.store.append(d, { identity: { ...decisionIdentity(d), copy: 1 } }), audit.store.append(d, { identity: { ...decisionIdentity(d), copy: 2 } })]);",
    probe: probe(`let n = 0; I.recordDeclarationDecisions({ audit: { store: { append: () => { n += 1; return {}; } } }, drafts: [{ eventType: "DECLARATION_DECISION", correlationId: "c", metadata: { declarationId: "d", from: "A", to: "B" } }] }); say(n !== 1);`),
    expect: /a transition was recorded other than exactly once/ },

  { id: "S17", what: "the production adapter ORPHANED (the entry point no longer reaches it)", test: T, named: "P43 ·",
    edits: [
      { file: BIN, from: 'import { legacyTenancyCandidates } from "../src/intake/legacy.mjs";\n', to: "" },
      { file: BIN, from: "  const inv = legacyTenancyCandidates(tenancy().declarations);", to: '  const inv = { readable: false, reason: "SABOTAGED" };' },
    ],
    probe: probe(`const d = world(); say(bin(d, "--inventory").j?.outcome !== "INVENTORY");`),
    expect: /\+\s+'src\/intake\/legacy\.mjs'/ },

  { id: "S18", what: "client / product vocabulary INSERTED into generic intake code", file: CONTRACT, test: T, named: "P42 ·",
    from: 'export const CONTRACT_ID = "project-declaration/1";',
    to: 'export const CONTRACT_ID = "project-declaration/1";\nexport const USUAL_CLIENT_ORIGIN = "https://usual-client.almiworld.com";',
    probe: probe(`say(/["']https?:\\/\\//.test(fs.readFileSync("${CONTRACT}", "utf8").split("\\n").filter((l) => !/^\\s*(\\*|\\/\\/|\\/\\*)/.test(l)).join("\\n")));`),
    expect: /\+\s+'src\/intake\/contract\.mjs:\d+'/ },

  { id: "S19", what: "a SUPERSEDED authority selected (the register picks the oldest applicable ruling)", file: "src/authority/register.mjs", test: T, named: "P48b ·",
    from: '  const newest = applicable.reduce((m, r) => (key(r) > m ? key(r) : m), "");',
    to: '  const newest = applicable.reduce((m, r) => (m === "" || key(r) < m ? key(r) : m), "");',
    probe: probe(`const CO = await import(u("config/authority/corpus.mjs")); const real = CO.AUTHORITY_CORPUS.find((r) => r.propositionId === "F01_FROZEN_ACCEPTANCE"); const newer = { ...real, authorityId: "synthetic:probe", issuedAt: "2026-09-25", effectiveFrom: "2026-09-25", contentHash: "e".repeat(64), recordedAt: "2026-09-25T00:00:00Z" }; say(I.intakeAuthority({ now: "2026-09-26", records: [...CO.AUTHORITY_CORPUS, newer] }).authorityHash !== "e".repeat(64));`),
    expect: /-\s+'e{64}'/ },

  { id: "S20", what: "ONE WORD of the frozen F01 acceptance changed in the engine's pin", file: "config/fboard/acceptances.mjs", test: T, named: "P48 ·",
    from: "refuses ambiguous",
    to: "accepts ambiguous",
    probe: probe(`const AC = await import(u("config/fboard/acceptances.mjs")); const F = await import(u("src/fboard/acceptance.mjs")); say(F.contractSha256(AC.ACCEPTANCES.F01) !== AC.ACCEPTANCES.F01.contractSha256);`),
    expect: /-\s+'5d7ddb4c6d37a3d96cbc8ce65797eb20f3119816a20084c9176aa089b5d80ccb'/ },
];

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
  const outArg = (process.argv.find((a) => a.startsWith("--out=")) ?? "").slice(6);
  const list = only.length ? F01_SABOTAGES.filter((s) => only.includes(s.id)) : F01_SABOTAGES;
  const cleanProbe = list.map((s) => {
    let out = "";
    try { out = execFileSync(process.execPath, ["--input-type=module", "-e", s.probe], { cwd: REPO, encoding: "utf8" }); } catch (e) { out = `ERROR ${e.message}`; }
    return { id: s.id, clean: /DEFECT_TOOK_EFFECT:false/.test(out) };
  });
  const bad = cleanProbe.filter((p) => !p.clean);
  console.log(`probe control on the clean tree: ${cleanProbe.length - bad.length} of ${cleanProbe.length} report no defect${bad.length ? ` — 🔴 ${bad.map((p) => p.id).join(", ")}` : ""}`);
  console.log("F01 · SABOTAGE — ran · landed (bytes AND behaviour) · named test RED · intended reason · restored\n");
  const run = runSabotages(list);
  const ran = run.results.filter((r) => !String(r.verdict).startsWith("NOT RUN")).length;
  const landed = run.results.filter((r) => r.landed === true && r.tookEffect === true).length;
  const couldFail = run.results.filter((r) => r.namedFailed === true && r.reason === true).length;
  const proved = run.results.filter((r) => r.verdict === "RED, named test, intended reason" && r.restoredClean && r.tookEffect === true).length;
  console.log(`\n${list.length} sabotage(s) · RAN ${ran} of ${list.length} · LANDED ${landed} of ${list.length} (bytes and behaviour) · COULD-FAIL ${couldFail} of ${list.length} (named test RED for the pinned reason) · PROVED ${proved} · residue ${run.residue.length} · production untouched ${run.productionUntouched}`);
  if (outArg) {
    const head = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const text = renderEvidence(run, { title: "F01 PRODUCT DECLARATION AND INTAKE — SABOTAGE EVIDENCE (§12)", head })
      + `\nPROBE CONTROL (clean tree): ${cleanProbe.length - bad.length} of ${cleanProbe.length} probes report no defect.\n`
      + run.results.map((r) => `  ${r.id}  ran ${!String(r.verdict).startsWith("NOT RUN")} · bytes landed ${r.landed} · defect took effect ${r.tookEffect} · named RED ${r.namedFailed} · pinned reason ${r.reason} · ${r.verdict} · restored ${r.restoredClean}  — ${r.what}`).join("\n")
      + `\nRAN ${ran} of ${list.length} · LANDED ${landed} of ${list.length} · COULD-FAIL ${couldFail} of ${list.length} · PROVED ${proved} of ${list.length}\n`;
    writeFileSync(join(REPO, outArg), text);
    console.log(`evidence written: ${outArg}`);
  }
  process.exit(bad.length === 0 && ran === list.length && landed === list.length && proved === list.length && run.residue.length === 0 && run.productionUntouched ? 0 : 1);
}
