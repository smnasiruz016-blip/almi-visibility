/**
 * F06 §11 · SABOTAGE — one independent defect per enforcement limb, each asserted to have RUN and to have LANDED (bytes
 * AND behaviour), each RED on its named proof for the intended reason, restored byte-identically (24 September 2026).
 *
 *   node test/helpers/f06-sabotage.mjs --deliberate [--only=E1,…] [--out=runs/audit/<file>.txt]
 *
 * RAN     the anchor occurs exactly once, the edit was applied, and the named test file was executed.
 * LANDED  the bytes hold the defect (shared harness) AND a probe run WHILE the defect is applied shows the mechanism
 *         now behaves differently (DEFECT_TOOK_EFFECT:true). Every probe is first run on the CLEAN tree and must say false.
 * Synthetic records and confined stores only; the production trail is hashed around the whole run.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runSabotages, renderEvidence } from "./f08-sabotage.mjs";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const MODEL = "src/evidence/evidence-state.mjs";
const ADAPT = "src/evidence/evidence-state-adapters.mjs";
const T = "test/f06-evidence-state.test.mjs";

const PRELUDE = `
const u = (p) => new URL(p, "file:///" + process.cwd().replace(/\\\\/g, "/") + "/").href;
const M = await import(u("${MODEL}"));
const A = await import(u("${ADAPT}"));
const say = (b) => console.log("DEFECT_TOOK_EFFECT:" + Boolean(b));
const tryMk = (s, meta) => { try { M.makeEvidenceState(s, { assignedBy: "probe", ...meta }); return true; } catch { return false; } };
const G = { OBSERVED: { evidenceRef: "o", sourceId: "s", observedAt: "2026-09-24" }, INFERRED: { inputRefs: ["o"], method: "m", computedAt: "2026-09-24" }, NOT_APPLICABLE: { checkId: "c", scope: "s", applicabilityReason: "R_X" }, NOT_MEASURED: { checkId: "c", noMeasurementReason: "R_X" }, UNKNOWN: { checkId: "c", insufficiency: "R_X" } };
const ISSUE = (o = {}) => ({ record_type: "issue", issue_id: "i", issue_class: "c", verdict: "FAIL", evidence: ["o"], detector: "d", detector_version: "1", opened_at: "2026-09-24T00:00:00Z", ...o });
`;
const probe = (body) => `${PRELUDE}\n${body}`;
const TCTX = `({ actor: "p", at: new Date(Date.now() - 2000).toISOString().replace(/\\.\\d{3}Z$/, "Z"), rule: "R", softwareVersion: "v", correlationId: "run:p", authorityRef: { propositionId: "P", scope: ["S"] }, authorityHash: "a".repeat(64) })`;
const COUNTING = `const events = []; const store = { append: (d) => { events.push(d); return { status: "APPENDED" }; }, readAll: () => ({ events }) };`;

export const F06_SABOTAGES = [
  { id: "E1", what: "a missing / undeclared state DEFAULTS to OBSERVED", file: ADAPT, test: T, named: "P35",
    from: 'return unmapped(`record_type ${record.record_type} has no declared rule`, "none");',
    to: 'return place("none", "OBSERVED", { evidenceRef: "defaulted", sourceId: "defaulted", observedAt: "2026-01-01" });',
    probe: probe(`say(A.evidenceStateOf({ record_type: "never_seen" }).state === "OBSERVED");`),
    expect: /SILENT_DEFAULT/ },

  { id: "E2", what: "UNKNOWN converted to PASS on the page", file: MODEL, test: T, named: "P16",
    from: '  UNKNOWN: "UNKNOWN", NOT_MEASURED: "NOT MEASURED", NOT_APPLICABLE: "NOT APPLICABLE",',
    to: '  UNKNOWN: "PASS", NOT_MEASURED: "NOT MEASURED", NOT_APPLICABLE: "NOT APPLICABLE",',
    probe: probe(`say(M.displayOf("UNKNOWN") === "PASS");`),
    expect: /UNKNOWN_READS_PASS/ },

  { id: "E3", what: "NOT_MEASURED allowed to carry a zero", file: MODEL, test: T, named: "P17",
    from: '  if (!["OBSERVED", "INFERRED"].includes(s)) for (const k of ["value", "valueUnit"])',
    to: '  if (false) for (const k of ["value", "valueUnit"])',
    probe: probe(`say(tryMk("NOT_MEASURED", { ...G.NOT_MEASURED, value: "0" }));`),
    expect: /The expression evaluated to a falsy value/ },

  { id: "E4", what: "NOT_APPLICABLE allowed without a reason", file: MODEL, test: T, named: "P6–P11",
    from: '  NOT_APPLICABLE: Object.freeze(["checkId", "scope", "applicabilityReason"]),',
    to: '  NOT_APPLICABLE: Object.freeze(["checkId", "scope"]),',
    probe: probe(`say(tryMk("NOT_APPLICABLE", { checkId: "c", scope: "s" }));`),
    expect: /NOT_APPLICABLE/ },

  { id: "E5", what: "the inference METHOD no longer required", file: MODEL, test: T, named: "P6–P11",
    from: '  INFERRED: Object.freeze(["inputRefs", "method", "computedAt"]),',
    to: '  INFERRED: Object.freeze(["inputRefs", "computedAt"]),',
    probe: probe(`say(tryMk("INFERRED", { inputRefs: ["o"], computedAt: "2026-09-24" }));`),
    expect: /INFERRED/ },

  { id: "E6", what: "the observation SOURCE reference no longer required", file: MODEL, test: T, named: "P6–P11",
    from: '  OBSERVED: Object.freeze(["evidenceRef", "sourceId", "observedAt"]),',
    to: '  OBSERVED: Object.freeze(["evidenceRef", "observedAt"]),',
    probe: probe(`say(tryMk("OBSERVED", { evidenceRef: "o", observedAt: "2026-09-24" }));`),
    expect: /OBSERVED/ },

  { id: "E7", what: "a recommendation presented as EVIDENCE (placed OBSERVED)", file: ADAPT, test: T, named: "P21",
    from: '  return place(rule, "RECOMMENDED", { supportingRefs, rule: `recommendation:${r.recommendation_id}`, proposedAt: r.drafted_at });',
    to: '  return place(rule, "OBSERVED", { evidenceRef: supportingRefs[0], sourceId: "recommendation", observedAt: r.drafted_at });',
    probe: probe(`const d = { record_type: "draft_recommendation", recommendation_id: "R", drafted_at: "2026-09-24" }; const l = { record_type: "recommendation_evidence", recommendation_id: "R", linked_at: "2026-09-24", issues: ["i"], observations: [], sources: [] }; say(A.evidenceStateOf(d, A.adapterContext([d, l])).state === "OBSERVED");`),
    expect: /RECOMMENDATION_AS_EVIDENCE/ },

  { id: "E8", what: "the evidence state MERGED with the verdict (verdict no longer a separate dimension)", file: MODEL, test: T, named: "P12",
    from: 'export const COUPLED_DIMENSIONS = Object.freeze(["verdict", "confidence",',
    to: 'export const COUPLED_DIMENSIONS = Object.freeze(["confidence",',
    probe: probe(`let code = null; try { M.makeEvidenceState("OBSERVED", { assignedBy: "p", ...G.OBSERVED, verdict: "FAIL" }); } catch (e) { code = e.code; } say(code !== "EVIDENCE_STATE_COUPLED");`),
    expect: /The expression evaluated to a falsy value|EVIDENCE_STATE_COUPLED/ },

  { id: "E9", what: "an ambiguous legacy label GUESSED (a reason-less UNKNOWN from any detector placed UNKNOWN)", file: ADAPT, test: T, named: "P24",
    from: '    if (!insufficiency) return unmapped(`an UNKNOWN issue with no reason code from detector ${r.detector ?? "(none)"} — no declared meaning`, rule);',
    to: '    if (!insufficiency) return place(`${rule}.guessed`, "UNKNOWN", { checkId: `check:${r.issue_class}`, insufficiency: "GUESSED_FROM_THE_WORD" });',
    probe: probe(`say(A.evidenceStateOf(ISSUE({ verdict: "UNKNOWN", detector: "anything-new" })).state === "UNKNOWN");`),
    expect: /a reason-less UNKNOWN from an undeclared detector/ },

  { id: "E10", what: "a cross-TENANT evidence reference allowed", file: MODEL, test: T, named: "P30",
    from: '    if (t && es.meta.tenantId && t !== es.meta.tenantId) f.push(',
    to: '    if (false && t && es.meta.tenantId && t !== es.meta.tenantId) f.push(',
    probe: probe(`const s = M.makeEvidenceState("INFERRED", { assignedBy: "p", tenantId: "t1", inputRefs: ["tenant:t2/observation:o"], method: "m", computedAt: "2026-09-24" }); say(M.isolationFaults(s).length === 0);`),
    expect: /Cannot read properties of undefined|EVIDENCE_REF_CROSS_TENANT|falsy/ },

  { id: "E11", what: "the F08 transition event SUPPRESSED", file: MODEL, test: T, named: "P33",
    from: '  return drafts.map((d) => audit.store.append(d, { identity: { eventType: d.eventType, fromRef: d.metadata.fromRef, toRef: d.metadata.toRef } }));',
    to: '  return drafts.map(() => ({ status: "APPENDED" }));',
    probe: probe(`${COUNTING} const d = M.checkTransition({ from: M.makeEvidenceState("INFERRED", { assignedBy: "p", ...G.INFERRED }), to: M.makeEvidenceState("UNKNOWN", { assignedBy: "p", ...G.UNKNOWN }), fromRef: "a", toRef: "b", newEvidenceRefs: ["x"] }, ${TCTX}); try { M.recordEvidenceStateTransitions({ audit: { store }, drafts: [d] }); } catch {} say(events.length === 0);`),
    expect: /not exactly one event/ },

  { id: "E12", what: "the F08 transition event DOUBLE-EMITTED", file: MODEL, test: T, named: "P33",
    from: '  return drafts.map((d) => audit.store.append(d, { identity: { eventType: d.eventType, fromRef: d.metadata.fromRef, toRef: d.metadata.toRef } }));',
    to: '  return drafts.map((d) => { audit.store.append(d, { identity: { eventType: d.eventType, fromRef: d.metadata.fromRef, toRef: d.metadata.toRef, copy: 2 } }); return audit.store.append(d, { identity: { eventType: d.eventType, fromRef: d.metadata.fromRef, toRef: d.metadata.toRef } }); });',
    probe: probe(`${COUNTING} const d = M.checkTransition({ from: M.makeEvidenceState("INFERRED", { assignedBy: "p", ...G.INFERRED }), to: M.makeEvidenceState("UNKNOWN", { assignedBy: "p", ...G.UNKNOWN }), fromRef: "a", toRef: "b", newEvidenceRefs: ["x"] }, ${TCTX}); M.recordEvidenceStateTransitions({ audit: { store }, drafts: [d] }); say(events.length === 2);`),
    expect: /not exactly one event/ },

  { id: "E13", what: "production caller wiring REMOVED — the governed write no longer places records", file: "src/governance/governed-run.mjs", test: T, named: "P18",
    from: "  if (unplaceable.length) {",
    to: "  if (false && unplaceable.length) {",
    probe: probe(`const R = await import(u("src/governance/governed-run.mjs")); const store = { path: process.cwd() + "/.test-scratch/probe-e13.jsonl", readAll: () => [], dedupeKeyOf: () => "k" }; let refused = false; try { R.governedStoreAppend({ repo: process.cwd(), permission: { mayWrite: false }, store, records: [{ record_type: "never_seen" }], action: "P", occurredAt: "2026-09-24T00:00:00Z", correlationId: "run:p" }); } catch (e) { refused = e.code === "EVIDENCE_STATE_UNPLACEABLE"; } say(!refused);`),
    expect: /The expression evaluated to a falsy value/ },

  { id: "E14", what: "a product / client word inserted into generic F06 code", file: ADAPT, test: T, named: "P39",
    from: "const h16 = (s) => createHash",
    to: 'const SUBJECT_HINT = "nursing"; void SUBJECT_HINT;\nconst h16 = (s) => createHash',
    probe: probe(`const fs = await import("node:fs"); say(/\\bnursing\\b/.test(fs.readFileSync("${ADAPT}", "utf8")));`),
    expect: /names nursing/ },

  { id: "E15", what: "a SUPERSEDED authority selected (the register picks the oldest applicable ruling)", file: "src/authority/register.mjs", test: T, named: "P40b",
    from: "  const newest = applicable.reduce((m, r) => (key(r) > m ? key(r) : m), \"\");",
    to: "  const newest = applicable.reduce((m, r) => (m === \"\" || key(r) < m ? key(r) : m), \"\");",
    probe: probe(`const CO = await import(u("config/authority/corpus.mjs")); const real = CO.AUTHORITY_CORPUS.find((r) => r.propositionId === "F06_FROZEN_ACCEPTANCE"); const newer = { ...real, authorityId: "synthetic:probe-newer", issuedAt: "2026-09-25", effectiveFrom: "2026-09-25", contentHash: "f".repeat(64), recordedAt: "2026-09-25T00:00:00Z" }; say(A.evidenceStateAuthority({ now: "2026-09-26", records: [...CO.AUTHORITY_CORPUS, newer] }).authorityHash === real.contentHash);`),
    expect: /SUPERSEDED_AUTHORITY_APPLIED/ },

  { id: "E16", what: "ONE WORD of the frozen F06 acceptance changed in the engine's pin", file: "config/fboard/acceptances.mjs", test: T, named: "P42",
    from: "report, compare, prioritise or act on it.",
    to: "report, compare, ignore or act on it.",
    probe: probe(`const AC = await import(u("config/fboard/acceptances.mjs")); const F = await import(u("src/fboard/acceptance.mjs")); say(F.contractSha256(AC.ACCEPTANCES.F06) !== AC.ACCEPTANCES.F06.contractSha256);`),
    expect: /Expected values to be strictly equal/ },
];

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
  const outArg = (process.argv.find((a) => a.startsWith("--out=")) ?? "").slice(6);
  const list = only.length ? F06_SABOTAGES.filter((s) => only.includes(s.id)) : F06_SABOTAGES;
  const cleanProbe = list.map((s) => {
    let out = "";
    try { out = execFileSync(process.execPath, ["--input-type=module", "-e", s.probe], { cwd: REPO, encoding: "utf8" }); } catch (e) { out = `ERROR ${e.message}`; }
    return { id: s.id, clean: /DEFECT_TOOK_EFFECT:false/.test(out) };
  });
  const bad = cleanProbe.filter((p) => !p.clean);
  console.log(`probe control on the clean tree: ${cleanProbe.length - bad.length} of ${cleanProbe.length} report no defect${bad.length ? ` — 🔴 ${bad.map((p) => p.id).join(", ")}` : ""}`);
  console.log("F06 §11 · SABOTAGE — ran · landed (bytes AND behaviour) · named test RED · intended reason · restored\n");
  const run = runSabotages(list);
  const ran = run.results.filter((r) => !String(r.verdict).startsWith("NOT RUN")).length;
  const landed = run.results.filter((r) => r.landed === true && r.tookEffect === true).length;
  const proved = run.results.filter((r) => r.verdict === "RED, named test, intended reason" && r.restoredClean && r.tookEffect === true).length;
  console.log(`\n${list.length} sabotage(s) · RAN ${ran} of ${list.length} · LANDED ${landed} of ${list.length} (bytes and behaviour) · PROVED ${proved} · residue ${run.residue.length} · production untouched ${run.productionUntouched}`);
  if (outArg) {
    const head = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const text = renderEvidence(run, { title: "F06 EVIDENCE STATE MODEL — SABOTAGE EVIDENCE (§11)", head })
      + `\nPROBE CONTROL (clean tree): ${cleanProbe.length - bad.length} of ${cleanProbe.length} probes report no defect.\n`
      + run.results.map((r) => `  ${r.id}  ran ${!String(r.verdict).startsWith("NOT RUN")} · bytes landed ${r.landed} · defect took effect ${r.tookEffect} · ${r.verdict} · restored ${r.restoredClean}  — ${r.what}`).join("\n")
      + `\nRAN ${ran} of ${list.length} · LANDED ${landed} of ${list.length} · PROVED ${proved} of ${list.length}\n`;
    writeFileSync(join(REPO, outArg), text);
    console.log(`evidence written: ${outArg}`);
  }
  process.exit(bad.length === 0 && ran === list.length && landed === list.length && proved === list.length && run.residue.length === 0 && run.productionUntouched ? 0 : 1);
}
