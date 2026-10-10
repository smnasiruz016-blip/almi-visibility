/**
 * AUDIT-STORE-ONLY PRIMITIVES · SABOTAGE — each guard this repair added, broken on its own, must turn its NAMED proof
 * RED for the intended reason; each is asserted to have RUN, to have LANDED (bytes AND behaviour) and to be restored
 * byte-identically (24 September 2026). The harness is F08's (test/helpers/f08-sabotage.mjs), unchanged.
 *
 *   node test/helpers/asp-sabotage.mjs --deliberate [--only=S1,…] [--out=runs/audit/<file>.txt]
 *
 * 🔴 NO SABOTAGE AIMS AT THE PRODUCTION TRAIL. Every target is a census, a proof or the store's location check; the
 * named proofs hand primitives in-memory stores and stand-in entry points; the runtime probe writes only inside an OS
 * temp directory it mints and removes. The harness hashes the production trail around the whole run.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runSabotages, renderEvidence } from "./f08-sabotage.mjs";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const VER = "tools/audit-store-primitives.mjs";
const CEN = "tools/governed-caller-census.mjs";
const WIR = "src/audit-trail/wiring.mjs";
const T = "test/audit-store-only-primitives.test.mjs";

const PRELUDE = `
const u = (p) => new URL(p, "file:///" + process.cwd().replace(/\\\\/g, "/") + "/").href;
const fs = await import("node:fs"); const os = await import("node:os"); const path = await import("node:path");
const V = await import(u("${VER}")); const C = await import(u("${CEN}")); const W = await import(u("${WIR}"));
const say = (b) => console.log("DEFECT_TOOK_EFFECT:" + Boolean(b));
const HEAD = ['import { dirname, join } from "node:path";', 'import { fileURLToPath } from "node:url";', 'import { recordCandidates, writeGateEvent } from "../src/audit-trail/recorder.mjs";', 'import { productionAuditStore } from "../src/audit-trail/wiring.mjs";', 'import { governedAuditContext } from "../src/governance/governed-run.mjs";', 'const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");', 'const permission = announceWritePermission(writePermission({ target: LOCAL }));', '  const drafts = [writeGateEvent({ permission })];'];
const row = (body, head = HEAD) => C.census({ sources: [{ file: "bin/zz-probe.mjs", text: [...head, ...body, ""].join("\\n") }] })[0];
const OWN = "const store = productionAuditStore({ repo: REPO });";
const CALL = "const result = recordCandidates({ store, candidates, corpus: CORPUS });";
const LIFE = "src/heldout/lifecycle.mjs";
const GATE = "export function recordGateDecisions({ audit, drafts }) {\\n  return drafts.map((d) => audit.store.append(d));";
const lifeText = fs.readFileSync(LIFE, "utf8").replace(/\\r\\n/g, "\\n");
`;
const probe = (body) => `${PRELUDE}\n${body}`;

export const ASP_SABOTAGES = [
  { id: "S1", what: "the proof accepts a write on ANY receiver (not only the handed audit store)", file: VER, test: T, named: "ASP-C6 · every real non-audit writer",
    from: "      if (!(homeModule && onOwnParam)) faults.push(",
    to: "      if (false) faults.push(",
    probe: probe(`say(V.verifyAuditStorePrimitive({ name: "persistCrawlObservations", module: "src/crawl/persist.mjs" }).verified);`),
    expect: /persistCrawlObservations passed the audit-store-only proof/ },

  { id: "S2", what: "the proof accepts a call to a caller-supplied function", file: VER, test: T, named: "ASP-C6 · every real non-audit writer",
    from: "      if (params.includes(callee)) { faults.push(`CALLS_CALLER_SUPPLIED_FUNCTION",
    /* The defect must ACCEPT the callback, not merely stop naming it: with the rule only switched off, the call still
     * fails as UNRESOLVED_CALL and nothing changes (the first design of this sabotage, 24 Sep 2026 — it did not land). */
    to: "      if (params.includes(callee)) continue; if (false) { faults.push(`CALLS_CALLER_SUPPLIED_FUNCTION",
    probe: probe(`say(V.verifyAuditStorePrimitive({ name: "readHeldOutItem", module: LIFE }).verified);`),
    expect: /(readHeldOutItem|createPaidProviderGate) passed the audit-store-only proof/ },

  { id: "S3", what: "the code scan no longer fails closed on an unterminated string", file: VER, test: T, named: "ASP-SCAN",
    from: "      if (t[j] !== c) return { ok: false, text: out };\n      out += c + blank(t.slice(i + 1, j)) + c;",
    to: "      if (false) return { ok: false, text: out };\n      out += c + blank(t.slice(i + 1, j)) + c;",
    probe: probe(`say(V.codeText('const s = "unterminated;\\n').ok);`),
    expect: /an unterminated string scanned clean/ },

  { id: "S4", what: "identity is the NAME again (the import's module is not checked)", file: CEN, test: T, named: "ASP-C6 · a registered NAME imported from another module",
    from: "    if (!identity) return { cls: \"UNKNOWN\", why:",
    to: "    if (false) return { cls: \"UNKNOWN\", why:",
    probe: probe(`const h = HEAD.map((l) => l.includes("recordCandidates, writeGateEvent") ? 'import { writeGateEvent } from "../src/audit-trail/recorder.mjs";\\nimport { recordCandidates } from "../src/crawl/persist.mjs";' : l); say(row([OWN, CALL], h).auditStoreExempt);`),
    expect: /a same-named import from another module earned the exemption/ },

  { id: "S5", what: "a product write on the primitive's own line is no longer seen", file: CEN, test: T, named: "ASP-C8 · a caller's own product write",
    from: "    if (FS_WRITE.test(rest) || STORE_WRITE.test(rest)) return",
    to: "    if (false) return",
    probe: probe(`say(row([OWN, CALL + " declarationStore.append(record);"]).auditStoreExempt);`),
    expect: /the primitive's line: exempt/ },

  { id: "S6", what: "the store a primitive is handed is no longer proved (any value is 'the audit store')", file: CEN, test: T, named: "ASP-C1c",
    from: "    const proved = provedOwnAuditStore(lines, entryValue(carriers[0]), i + 1);",
    to: "    const proved = { ok: true, why: \"sabotaged\" };",
    probe: probe(`say(row(['const store = productionAuditStore({ repo: REPO, at: { eventsPath: "config/x.jsonl", headPath: "config/h.json" } });', CALL]).auditStoreExempt);`),
    expect: /at: a product path: still exempt/ },

  { id: "S7", what: "a caller-chosen location (`at`) is allowed on the production store constructor", file: CEN, test: T, named: "ASP-C1c",
    from: "  productionAuditStore: new Set([\"repo\", \"clock\"]),",
    to: "  productionAuditStore: new Set([\"repo\", \"clock\", \"at\"]),",
    probe: probe(`say(row(['const store = productionAuditStore({ repo: REPO, at: { eventsPath: "config/x.jsonl", headPath: "config/h.json" } });', CALL]).auditStoreExempt);`),
    expect: /at: a product path: still exempt/ },

  { id: "S8", what: "any binding counts as the entry point's own root", file: CEN, test: T, named: "ASP-C1c",
    from: "  return b.kind === \"CONST\" && /\\bimport\\.meta\\.url\\b/.test(b.value);",
    to: "  return b.kind === \"CONST\";",
    probe: probe(`say(row(['const OTHER = "C:/elsewhere";', "const store = productionAuditStore({ repo: OTHER });", CALL]).auditStoreExempt);`),
    expect: /a repo bound to something else: still exempt/ },

  { id: "S9", what: "a spread audit context may override its own store", file: CEN, test: T, named: "ASP-C3 · CONTROLS",
    from: "    if (entries.some((e) => entryKey(e) === \"store\")) return",
    to: "    if (false) return",
    probe: probe(`say(row(["const store = { ...governedAuditContext({ repo: REPO }), store: productStore };", CALL]).auditStoreExempt);`),
    expect: /a context whose store is overridden: exempt/ },

  { id: "S10", what: "a writer imported under an alias is read past again", file: CEN, test: T, named: "ASP-C4 · CONTROLS",
    from: "  for (const x of importsOf(text)) if (x.aliased && names.has(x.exported)) out.push(",
    to: "  for (const x of importsOf(text)) if (false) out.push(",
    probe: probe(`const h = HEAD.filter((l) => !/writePermission|writeGateEvent\\(|recordCandidates, writeGateEvent/.test(l)); say(row(['import { recordCandidates as rc } from "../src/audit-trail/recorder.mjs";', OWN, "rc({ store: declarationStore, candidates, corpus: CORPUS });"], h).cls !== "GOVERNED_STATE_CHANGE");`),
    expect: /an aliased caller is invisible/ },

  { id: "S11", what: "an UNVERIFIED entry stays registered", file: CEN, test: T, named: "ASP-C7",
    from: "  const registered = verifiedPrimitives(verification);",
    to: "  const registered = verification.map(({ name, module }) => ({ name, module }));",
    probe: probe(`const changed = lifeText.replace(GATE, GATE.replace("audit.store.append(d)", "PRODUCT_STORE.append(d)")); const rows = C.census({ primitiveRead: (f) => f === LIFE ? changed : fs.readFileSync(f, "utf8") }); say(!C.bypasses(rows).some((r) => r.file === "bin/heldout-evaluation.mjs"));`),
    /* F10 (26 Sep 2026): the evaluator also routes its scoring run through the boundary, so its CALLER class is BOUNDARY_ROUTED
     * and caller-level auditStoreExempt is false by construction — the old probe could no longer see this defect. The defect's
     * effect is that the caller of a changed primitive is NOT a bypass; that is what the probe now reads. */
    expect: /(bin\/heldout-evaluation\.mjs is not a bypass|the changed primitive's caller is still exempt)/ },

  { id: "S12", what: "--check ignores an unverified primitive", file: CEN, test: T, named: "ASP-C6 · every real non-audit writer",
    from: "  for (const v of verification.filter((x) => !x.verified)) why.push(",
    to: "  for (const v of []) why.push(",
    probe: probe(`const v = V.verifyRegistry({ entries: [...V.AUDIT_STORE_ONLY_PRIMITIVES, { name: "persistCrawlObservations", module: "src/crawl/persist.mjs" }] }); say(C.checkVerdict(C.census(), v).length === 0);`),
    expect: /--check stays green/ },

  { id: "S13", what: "the writer derivation reads only receivers NAMED like a store again", file: CEN, test: T, named: "ASP-C5 · a NEW recorder",
    from: "const APPEND_ON_STORE = /\\b[\\w$]+\\??\\.(append|appendIfNew|appendWithoutDedupe|appendAllWithoutDedupe)\\(/;",
    to: "const APPEND_ON_STORE = /\\b(store|ledger|s|target)\\??\\.(append|appendIfNew|appendWithoutDedupe|appendAllWithoutDedupe)\\(/;",
    probe: probe(`const t = "export function recordThings({ audit, drafts }) {\\n  const t = audit.store;\\n  return drafts.map((d) => t.append(d));\\n}\\n"; say(!C.derivedWriterExports({ files: ["src/zz/r.mjs"], read: () => t }).some((w) => w.name === "recordThings"));`),
    expect: /an alias receiver: not derived as a writer/ },

  { id: "S14", what: "condition A reads the registered NAME again, not the site's verdict", file: CEN, test: T, named: "ASP-C8 · a caller's own product write",
    from: "  const targetsOnlyAuditStore = sites.length > 0 && sites.every((s) => classifySite(text, s, opts).cls === \"CHECKED_AUDIT_STORE_EXEMPTION\");",
    to: "  const targetsOnlyAuditStore = sites.length > 0 && sites.every((s) => AUDIT_STORE_REACHING.test(s.text));",
    probe: probe(`say(row([OWN, CALL + " declarationStore.append(record);"]).exemption.targetsOnlyAuditStore);`),
    expect: /condition A still reads the NAME/ },

  { id: "S15", what: "the production store's location check is not wired to append", file: WIR, test: T, named: "ASP-C1d",
    from: "    assertLocation: at ? () => {} : () => assertDeclaredAuditLocation(repo),",
    to: "    assertLocation: () => {},",
    probe: probe(`const b = fs.mkdtempSync(path.join(os.tmpdir(), "asp-s15-")); try { const r = path.join(b, "r"); fs.mkdirSync(r); const e = path.join(b, "e"); fs.mkdirSync(e); fs.symlinkSync(e, path.join(r, "audit-trail"), "junction"); let msg = ""; try { W.productionAuditStore({ repo: r, forbiddenSubstrings: [] }).append({ eventType: "X" }); } catch (x) { msg = String(x.message); } say(!/AUDIT_STORE_LOCATION_REFUSED/.test(msg)); } finally { fs.rmSync(b, { recursive: true, force: true }); }`),
    expect: /the check is not on the production append path/ },
];

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
  const outArg = (process.argv.find((a) => a.startsWith("--out=")) ?? "").slice(6) || null;
  const list = only.length ? ASP_SABOTAGES.filter((s) => only.includes(s.id)) : ASP_SABOTAGES;
  /* CONTROL: every probe on the CLEAN tree must report no defect, or it could not tell the sabotage from the baseline. */
  const cleanProbe = list.map((s) => {
    let out = "";
    try { out = execFileSync(process.execPath, ["--input-type=module", "-e", s.probe], { cwd: REPO, encoding: "utf8" }); } catch (e) { out = `ERROR ${e.message}`; }
    return { id: s.id, clean: /DEFECT_TOOK_EFFECT:false/.test(out) };
  });
  const bad = cleanProbe.filter((p) => !p.clean);
  console.log(`probe control on the clean tree: ${cleanProbe.length - bad.length} of ${cleanProbe.length} report no defect${bad.length ? ` — 🔴 ${bad.map((p) => p.id).join(", ")}` : ""}`);
  console.log("AUDIT-STORE-ONLY PRIMITIVES · SABOTAGE — ran · landed (bytes AND behaviour) · named test RED · intended reason · restored\n");
  const run = runSabotages(list);
  const ran = run.results.filter((r) => !String(r.verdict).startsWith("NOT RUN")).length;
  const landed = run.results.filter((r) => r.landed === true && r.tookEffect === true).length;
  const couldFail = run.results.filter((r) => r.namedFailed === true && r.reason === true).length;
  const proved = run.results.filter((r) => r.verdict === "RED, named test, intended reason" && r.restoredClean && r.tookEffect === true).length;
  console.log(`\n${list.length} sabotage(s) · RAN ${ran} of ${list.length} · LANDED ${landed} of ${list.length} (bytes and behaviour) · COULD-FAIL ${couldFail} of ${list.length} (named test RED for the pinned reason) · PROVED ${proved} · residue ${run.residue.length} · production untouched ${run.productionUntouched}`);
  if (outArg) {
    const head = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const text = renderEvidence(run, { title: "AUDIT-STORE-ONLY PRIMITIVES — SABOTAGE EVIDENCE (owner ruling 24 Sep 2026)", head })
      + `\nPROBE CONTROL (clean tree): ${cleanProbe.length - bad.length} of ${cleanProbe.length} probes report no defect.\n`
      + run.results.map((r) => `  ${r.id}  ran ${!String(r.verdict).startsWith("NOT RUN")} · bytes landed ${r.landed} · defect took effect ${r.tookEffect} · named RED ${r.namedFailed} · pinned reason ${r.reason} · ${r.verdict} · restored ${r.restoredClean}  — ${r.what}`).join("\n")
      + `\nRAN ${ran} of ${list.length} · LANDED ${landed} of ${list.length} · COULD-FAIL ${couldFail} of ${list.length} · PROVED ${proved} of ${list.length}\n`;
    writeFileSync(join(REPO, outArg), text);
    console.log(`evidence written: ${outArg}`);
  }
  process.exit(bad.length === 0 && ran === list.length && landed === list.length && proved === list.length && run.residue.length === 0 && run.productionUntouched ? 0 : 1);
}
