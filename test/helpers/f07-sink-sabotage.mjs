/**
 * F07/F08 SINK REPAIR §4 · SABOTAGE — each independent limb of the repair, separately; each asserted to have RUN and to
 * have LANDED, which are different claims.
 *
 *   node test/helpers/f07-sink-sabotage.mjs [--only=K1,…] [--out=runs/audit/<file>.txt]
 *
 * RAN     the edit was applied (its anchor occurs exactly once) and the named test file was executed.
 * LANDED  two checks, both required: the bytes hold the defect (the shared harness), AND a behavioural probe run WHILE
 *         the defect is applied shows the mechanism now behaves differently (DEFECT_TOOK_EFFECT:true). Every probe is
 *         also run on the CLEAN tree first and must report false there — a probe that cannot tell the difference would
 *         manufacture a landing.
 *
 * Synthetic decisions and counting stores only; the production trail is hashed around the whole run.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runSabotages, renderEvidence } from "./f08-sabotage.mjs";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const GUARD = "src/governance/guard-audit.mjs";
const LIFE = "src/heldout/lifecycle.mjs";
const EVENT = "src/audit-trail/event.mjs";
const SCAN = "tools/heldout-firewall.mjs";
const T = "test/f07-sink-repair.test.mjs";

/* ── PROBES: ES modules, run with cwd = the repository. Each prints DEFECT_TOOK_EFFECT:<bool>. ── */
const PRELUDE = `
const u = (p) => new URL(p, "file:///" + process.cwd().replace(/\\\\/g, "/") + "/").href;
const { durableGuardSink, guardAuthority, auditClassOf } = await import(u("src/governance/guard-audit.mjs"));
const { countingStore } = await import(u("tools/heldout-access-census.mjs"));
const sinkFor = (actor = "probe") => { const store = countingStore(); return { store, sink: durableGuardSink({ store, actor, softwareVersion: "probe", correlationId: "run:probe", ...guardAuthority({ now: "2026-09-23" }) }) }; };
const ROLE_ALLOWED = { eventType: "EVIDENCE_ROLE_DECISION", action: "EXEMPT_AS_OBSERVED_DATA", outcome: "ALLOWED", reasonCode: "REGISTERED_OBSERVED_DATA", metadata: { guard: "observedDataExemption", classification: "OBSERVED_DATA_EXEMPT", ruleEntry: "probe", role: "OBSERVED_DATA", root: "probe" } };
const REFUSAL = { eventType: "REFUSAL", action: "READ_SEALED_PATH", outcome: "REFUSED", reasonCode: "SEALED_PATH_REFUSED", metadata: { guard: "readUnsealed", classification: "SEALED", ruleEntry: "probe", root: "probe" } };
const say = (b) => console.log("DEFECT_TOOK_EFFECT:" + Boolean(b));
`;
const probe = (body) => `${PRELUDE}\n${body}`;

const LIFE_PROBE = probe(`
const L = await import(u("src/heldout/lifecycle.mjs"));
const { AUTHORITY_CORPUS } = await import(u("config/authority/corpus.mjs"));
const { EVIDENCE_ROLE_REGISTRY } = await import(u("config/evidence-roles.mjs"));
const store = countingStore();
const audit = { store, actor: "probe", softwareVersion: "probe", correlationId: "run:probe-life", ...guardAuthority({ now: "2026-09-23" }) };
const SET = { id: "synthetic:probe-set", role: "HELD_OUT_EVIDENCE", sealed: true, mayEvaluate: true, mandatoryReadable: false, maySupplyExpectedAnswer: false, mayTrain: false, retiredReason: null, contentHash: L.populationCommitment(["a"]), resource: { root: "syn", pathPrefixes: ["probe/"] } };
const OWNER = AUTHORITY_CORPUS.find((r) => r.status === "CURRENT" && r.issuer?.class === "OWNER");
const AUTH = [...AUTHORITY_CORPUS, { ...OWNER, authorityId: "synthetic:probe-eval", propositionId: "SYNTHETIC_PROBE_EVALUATOR", scope: ["ALMIVISIBILITY"], supersedes: [], supersededBy: [], contentHash: "f".repeat(64), issuedAt: "2026-01-01", effectiveFrom: "2026-01-01" }];
const MECH = L.mechanismHash({ "m.mjs": "probe" });
let allowed = false, recorded = false;
try {
  L.freezeMechanism({ audit, mechanismId: "probe-mech", mechanismHash: MECH, frozenAt: "2026-09-23T10:00:00Z" });
  const g = L.requestHeldOutAccess({ audit, registry: [SET, ...EVIDENCE_ROLE_REGISTRY], authorityRecords: AUTH, request: { mechanismId: "probe-mech", mechanismHash: MECH, sealedSetId: SET.id, populationCommitment: SET.contentHash, protocolId: "p", evaluatorAuthority: { propositionId: "SYNTHETIC_PROBE_EVALUATOR", scope: ["ALMIVISIBILITY"] }, purpose: "assessment", at: "2026-09-23T11:00:00Z" } });
  allowed = g.allowed;
} catch { allowed = false; }
recorded = store.events.some((e) => e.action === "HELDOUT_ACCESS" && e.outcome === "ALLOWED");
say(!(allowed && recorded));
`);

export const SINK_SABOTAGES = [
  { id: "K1", what: "diagnostic classification made durable again", file: GUARD, test: T, named: "(a)(b)(d)",
    from: '      if (auditClass === "CLASSIFICATION") {', to: '      if (false && auditClass === "CLASSIFICATION") {',
    probe: probe(`const { store, sink } = sinkFor(); sink.emit(ROLE_ALLOWED); say(store.events.length === 1);`),
    expect: /a clean classification reached the durable trail/ },

  { id: "K2", what: "a real refusal made non-durable (the derivation calls it a classification)", file: GUARD, test: T, named: "(a)(b)(d)",
    from: '  if (eventType === "REFUSAL") return "ACCESS";', to: '  if (eventType === "REFUSAL") return "CLASSIFICATION";',
    probe: probe(`const { store, sink } = sinkFor(); sink.emit(REFUSAL); say(store.events.length === 0);`),
    expect: /a real refusal did not append exactly one event/ },

  { id: "K3", what: "the derivation replaced by a CALLER-SUPPLIED LABEL", file: GUARD, test: T, named: "DERIVATION, NOT DECLARATION",
    from: "      const auditClass = auditClassOf(draft);", to: '      const auditClass = decision.diagnostic === true || decision.durable === false ? "CLASSIFICATION" : auditClassOf(draft);',
    probe: probe(`const { store, sink } = sinkFor(); sink.emit({ ...REFUSAL, diagnostic: true, durable: false }); say(store.events.length === 0);`),
    expect: /a caller's flag or name moved the line/ },

  { id: "K4", what: "the derivation replaced by an ALLOWLIST of diagnostic callers", file: GUARD, test: T, named: "(a)(b)(d)",
    from: "      const auditClass = auditClassOf(draft);", to: '      const auditClass = ["bin/heldout-firewall.mjs", "tools/audit-trail-census.mjs"].includes(actor) ? "CLASSIFICATION" : auditClassOf(draft);',
    probe: probe(`const { store, sink } = sinkFor("bin/heldout-firewall.mjs"); sink.emit(REFUSAL); say(store.events.length === 0);`),
    expect: /a real refusal did not append exactly one event/ },

  { id: "K5", what: "an authorised access SILENTLY unrecorded (the lifecycle skips its append and reports success)", file: LIFE, test: T, named: "(c)",
    from: "  if (!isDurableDecision(draft)) throw new HeldOutRefused(",
    to: '  if (action === EVALUATION_ACTIONS.ACCESS && outcome === "ALLOWED") return { status: "APPENDED", event: { ...draft, eventId: "0".repeat(32) }, appended: true };\n  if (!isDurableDecision(draft)) throw new HeldOutRefused(',
    probe: LIFE_PROBE,
    expect: /an authorised access did not append exactly one event/ },

  { id: "K6", what: "an authorised access derived a classification — the lifecycle must REFUSE, never drop", file: GUARD, test: T, named: "(c)",
    /* Re-anchored 25 Sep 2026 (F07 Amendment 1): the classified line now also names the census's in-boundary read. The
     * sabotage is unchanged in intent — the evaluator's own HELDOUT_ACCESS is derived a classification. */
    /* Re-anchored 10 Oct 2026 (RR-246): since 4e728af (28 Sep, Part D1) the line also names the key access; the span had not matched
     * since. The sabotage is unchanged in intent — the evaluator's own HELDOUT_ACCESS is derived a classification. */
    from: '  if (eventType === "EVALUATION") return action === "HELDOUT_ACCESS" || action === "HELDOUT_CENSUS_READ" || action === "HELDOUT_KEY_ACCESS" ? "ACCESS" : "GOVERNED_CHANGE";', to: '  if (eventType === "EVALUATION") return action === "HELDOUT_ACCESS" ? "CLASSIFICATION" : action === "HELDOUT_CENSUS_READ" || action === "HELDOUT_KEY_ACCESS" ? "ACCESS" : "GOVERNED_CHANGE";',
    probe: LIFE_PROBE,
    expect: /EVALUATION_EVENT_NOT_DURABLE/ },

  { id: "K7", what: "a firewall violation outside DATA no longer recorded", file: SCAN, test: T, named: "(a)(b)(d)",
    from: '    if (judge && category !== "DATA" && disposition.startsWith("FAIL")) {', to: '    if (false && judge && category !== "DATA" && disposition.startsWith("FAIL")) {',
    probe: probe(`
const fs = await import("node:fs"); const { join } = await import("node:path");
const { scan } = await import(u("tools/heldout-firewall.mjs"));
const dir = fs.mkdtempSync(join(process.cwd(), ".test-scratch", "probe-k7-"));
try {
  fs.writeFileSync(join(dir, "leak.md"), "probe phrase seven here\\n");
  const { store, sink } = sinkFor();
  const r = scan({ registry: [{ id: "x", role: "SEALED", resource: { root: "elsewhere", pathPrefixes: ["nowhere/"] } }], root: "syn", base: dir, files: ["leak.md"], members: ["probe phrase seven"], fragments: [], audit: sink });
  say(r.failures.length === 1 && store.events.length === 0);
} finally { fs.rmSync(dir, { recursive: true, force: true }); }`),
    expect: /a real violation did not append exactly one event/ },

  { id: "K10", what: "a REPORT-ONLY scan judges again — the 24 September defect: 17 unjudged draft rows recorded as violations", file: SCAN, test: T, named: "(a′)",
    from: '    if (judge && category !== "DATA" && disposition.startsWith("FAIL")) {', to: '    if (category !== "DATA" && disposition.startsWith("FAIL")) {',
    probe: probe(`
const fs = await import("node:fs"); const { join } = await import("node:path");
const { scan } = await import(u("tools/heldout-firewall.mjs"));
const dir = fs.mkdtempSync(join(process.cwd(), ".test-scratch", "probe-k10-"));
try {
  fs.writeFileSync(join(dir, "leak.md"), "probe phrase ten here\\n");
  const { store, sink } = sinkFor();
  scan({ registry: [{ id: "x", role: "SEALED", resource: { root: "elsewhere", pathPrefixes: ["nowhere/"] } }], root: "syn", base: dir, files: ["leak.md"], members: ["probe phrase ten"], fragments: [], audit: sink, judge: false });
  say(store.events.length === 1);
} finally { fs.rmSync(dir, { recursive: true, force: true }); }`),
    expect: /a report-only scan appended a violation/ },

  { id: "K8", what: "the conflict fix WIDENED to every event — a native event's correlation stops deciding sameness", file: EVENT, test: T, named: "CONFLICT FIX",
    from: "    if (event.migration === true && MIGRATION_PASS_FIELDS.includes(k)) continue;", to: "    if (MIGRATION_PASS_FIELDS.includes(k)) continue;",
    probe: probe(`const { contentFingerprint } = await import(u("src/audit-trail/event.mjs")); const e = { eventType: "REFUSAL", migration: false, correlationId: "run:a", metadata: {} }; say(contentFingerprint(e) === contentFingerprint({ ...e, correlationId: "run:b" }));`),
    expect: /NATIVE_CORRELATION_IGNORED/ },

  { id: "K9", what: "the conflict fix REMOVED — the migration pass decides sameness again", file: EVENT, test: T, named: "CONFLICT FIX",
    from: "    if (event.migration === true && MIGRATION_PASS_FIELDS.includes(k)) continue;\n", to: "",
    probe: probe(`const { contentFingerprint } = await import(u("src/audit-trail/event.mjs")); const e = { eventType: "BOARD_TRANSITION", migration: true, correlationId: "migration:aaaaaaaaaaaa", metadata: {} }; say(contentFingerprint(e) !== contentFingerprint({ ...e, correlationId: "migration:bbbbbbbbbbbb" }));`),
    expect: /MIGRATION_PASS_DECIDES_SAMENESS/ },
];

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
  const outArg = (process.argv.find((a) => a.startsWith("--out=")) ?? "").slice(6);
  const list = only.length ? SINK_SABOTAGES.filter((s) => only.includes(s.id)) : SINK_SABOTAGES;

  /* PROBE CONTROL — every probe on the CLEAN tree must say the defect did NOT take effect. */
  const cleanProbe = list.map((s) => {
    let out = "";
    try { out = execFileSync(process.execPath, ["--input-type=module", "-e", s.probe], { cwd: REPO, encoding: "utf8" }); } catch (e) { out = `ERROR ${e.message}`; }
    return { id: s.id, clean: /DEFECT_TOOK_EFFECT:false/.test(out) };
  });
  const badProbes = cleanProbe.filter((p) => !p.clean);
  console.log(`probe control on the clean tree: ${cleanProbe.length - badProbes.length} of ${cleanProbe.length} report no defect${badProbes.length ? ` — 🔴 ${badProbes.map((p) => p.id).join(", ")}` : ""}`);

  console.log("SINK REPAIR §4 · SABOTAGE — ran · landed (bytes AND behaviour) · named test RED · intended reason · restored\n");
  const run = runSabotages(list);
  const ran = run.results.filter((r) => !String(r.verdict).startsWith("NOT RUN")).length;
  const landed = run.results.filter((r) => r.landed === true && r.tookEffect === true).length;
  const proved = run.results.filter((r) => r.verdict === "RED, named test, intended reason" && r.restoredClean && r.tookEffect === true).length;
  console.log(`\n${list.length} sabotage(s) · RAN ${ran} of ${list.length} · LANDED ${landed} of ${list.length} (bytes and behaviour) · PROVED ${proved} · residue ${run.residue.length} · production untouched ${run.productionUntouched}`);
  if (outArg) {
    const head = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const text = renderEvidence(run, { title: "F07/F08 SINK REPAIR — SABOTAGE EVIDENCE (§4)", head })
      + `\nPROBE CONTROL (clean tree): ${cleanProbe.length - badProbes.length} of ${cleanProbe.length} probes report no defect.\n`
      + run.results.map((r) => `  ${r.id}  ran ${!String(r.verdict).startsWith("NOT RUN")} · bytes landed ${r.landed} · defect took effect ${r.tookEffect} · ${r.verdict} · restored ${r.restoredClean}  — ${r.what}`).join("\n")
      + `\nRAN ${ran} of ${list.length} · LANDED ${landed} of ${list.length} · PROVED ${proved} of ${list.length}\n`;
    writeFileSync(join(REPO, outArg), text);
    console.log(`evidence written: ${outArg}`);
  }
  process.exit(badProbes.length === 0 && ran === list.length && landed === list.length && proved === list.length && run.residue.length === 0 && run.productionUntouched ? 0 : 1);
}
