/**
 * F06 CORRECTION · SABOTAGE — one independent defect per limb of the correction, each asserted to have RUN and to have
 * LANDED (bytes AND behaviour), each RED on its named K-proof for the intended reason, restored byte-identically
 * (24 September 2026). The harness is F08's (test/helpers/f08-sabotage.mjs), unchanged.
 *
 *   node test/helpers/f06-correction-sabotage.mjs --deliberate [--only=X1,…] [--out=runs/audit/<file>.txt]
 *
 * Every probe is first run on the CLEAN tree and must report no defect. Synthetic records only; the production trail
 * is hashed around the whole run.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runSabotages, renderEvidence } from "./f08-sabotage.mjs";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const WRITER = "src/discovery/market-measurement.mjs";
const LEGACY = "src/evidence/legacy-artefacts.mjs";
const VERDICT = "src/evidence/verdict.mjs";
const CENSUS = "tools/evidence-state-census.mjs";
const T = "test/f06-correction.test.mjs";

const PRELUDE = `
const u = (p) => new URL(p, "file:///" + process.cwd().replace(/\\\\/g, "/") + "/").href;
const L = await import(u("${LEGACY}"));
const V = await import(u("${VERDICT}"));
const W = await import(u("${WRITER}"));
const C = await import(u("${CENSUS}"));
const S = await import(u("src/evidence/store.mjs"));
const fs = await import("node:fs");
const say = (b) => console.log("DEFECT_TOOK_EFFECT:" + Boolean(b));
const STORED = JSON.parse(fs.readFileSync("${"runs/discovery/market-measurement-2026-09-15.json"}", "utf8"));
const STORE = () => S.createJsonlStore("runs/evidence/evidence.jsonl").readAll();
const clone = (x) => JSON.parse(JSON.stringify(x));
const supplyOf = (a) => L.marketMeasurementCompat(a).find((e) => e.path === "$.dimensions.SUPPLY.state");
`;
const probe = (body) => `${PRELUDE}\n${body}`;

export const F06_CORRECTION_SABOTAGES = [
  { id: "X1", what: "the live Row 7 writer regresses to UNKNOWN for a dimension it never measured", file: WRITER, test: T, named: "K4 ·",
    from: "const unmeasured = (dimension, why) => Object.freeze({ dimension, state: NOT_MEASURED,",
    to: "const unmeasured = (dimension, why) => Object.freeze({ dimension, state: UNKNOWN,",
    probe: probe(`say(W.measureMarket(STORE()).dimensions.SUPPLY.state === "UNKNOWN");`),
    expect: /\+\s+'UNKNOWN',\s*\n\s*-\s+'NOT_MEASURED',/ },

  { id: "X2", what: "the adapter decides from the OLD LABEL alone (a deferred UNKNOWN placed NOT_MEASURED with no measured:false)", file: LEGACY, test: T, named: "K2 ·",
    from: "if (el.deferred && node && node.measured === false) {",
    to: 'if (el.deferred && node && originalState === "UNKNOWN") {',
    probe: probe(`const a = clone(STORED); delete a.dimensions.SUPPLY.measured; say(supplyOf(a).canonicalEvidenceState === "NOT_MEASURED");`),
    expect: /expected: 'UNMAPPED'\s*\n\s*actual: 'NOT_MEASURED'/ },

  { id: "X3", what: "the adapter treats an ABSENT field as proof (a missing measured reads as not performed)", file: LEGACY, test: T, named: "K2 ·",
    from: "if (el.deferred && node && node.measured === false) {",
    to: "if (el.deferred && node && !node.measured) {",
    probe: probe(`const a = clone(STORED); delete a.dimensions.SUPPLY.measured; say(supplyOf(a).canonicalEvidenceState === "NOT_MEASURED");`),
    expect: /expected: 'UNMAPPED'\s*\n\s*actual: 'NOT_MEASURED'/ },

  { id: "X4", what: "the adapter is LOSSY — the stored literal is dropped from originalState", file: LEGACY, test: T, named: "K1 ·",
    from: "const base = { path: el.path, originalState: originalState === undefined ? null : originalState };",
    to: "const base = { path: el.path, originalState: null };",
    probe: probe(`say(L.marketMeasurementCompat(STORED)[0].originalState === null);`),
    expect: /expected: 'OBSERVED'\s*\n\s*actual: ~/ },

  { id: "X5", what: "the byte pin dropped — any bytes are read as the 15 September artefact", file: LEGACY, test: T, named: "K3 ·",
    from: 'return typeof text === "string" && sha(text.replace(/\\r\\n/g, "\\n")) === LEGACY_MARKET_MEASUREMENT.sha256;',
    to: 'return typeof text === "string";',
    probe: probe(`say(L.isLegacyMarketBytes("not the artefact"));`),
    expect: /altered bytes must never read as the 15 September artefact/ },

  { id: "X6", what: "OUTCOME_ALIASES collapses not-applicable into UNKNOWN again", file: VERDICT, test: T, named: "K5 ·",
    from: '        state: "NOT_APPLICABLE",\n        basis: "DECLARED_SOURCE_QUOTABLE",',
    to: '        state: "UNKNOWN",\n        basis: "DECLARED_SOURCE_QUOTABLE",',
    probe: probe(`say(V.placeCheckOutcome({ record: { id: "q", sourceQuotable: false, checks: { quoteMatchOutcome: "not-applicable" } }, field: "quoteMatchOutcome" }).state === "UNKNOWN");`),
    expect: /\+\s+'UNKNOWN',\s*\n\s*-\s+'NOT_APPLICABLE',/ },

  { id: "X7", what: "an ambiguous could-not-check GUESSED as UNKNOWN from the literal alone", file: VERDICT, test: T, named: "K8 ·",
    from: '  return unmapped("could-not-check with no positive record',
    to: '  return Object.freeze({ ...base, state: "UNKNOWN", basis: "LABEL_ALONE" }); return unmapped("could-not-check with no positive record',
    probe: probe(`say(V.placeCheckOutcome({ record: { id: "b", pageFingerprint: null, checks: { fingerprintOutcome: "could-not-check" } }, field: "fingerprintOutcome" }).state === "UNKNOWN");`),
    expect: /expected: 'UNMAPPED'\s*\n\s*actual: 'UNKNOWN'/ },

  { id: "X8", what: "\"reached\" accepted from an attempt for ANOTHER record or check", file: VERDICT, test: T, named: "K6 ·",
    from: 'if (attempt && attempt.reached === true && attempt.recordId === record?.id && attempt.field === field && attempt.outcome === "could-not-check") {',
    to: "if (attempt) {",
    probe: probe(`say(V.placeCheckOutcome({ record: { id: "r", checks: { linkCheckOutcome: "could-not-check" } }, field: "linkCheckOutcome", attempt: { recordId: "other", field: "linkCheckOutcome", reached: true, outcome: "could-not-check" } }).state === "UNKNOWN");`),
    expect: /expected: 'UNMAPPED'\s*\n\s*actual: 'UNKNOWN'/ },

  { id: "X9", what: "NOT_MEASURED placed on HALF a derived fact (the kind word alone, with a source)", file: VERDICT, test: T, named: "K7 ·",
    from: '  r?.kind === "derived" && Array.isArray(r?.derivation?.inputs) && r.derivation.inputs.length > 0 && (r.source === undefined || r.source === null);',
    to: '  r?.kind === "derived";',
    probe: probe(`say(V.placeCheckOutcome({ record: { id: "d", kind: "derived", source: { url: "x" }, checks: { linkCheckOutcome: "could-not-check" } }, field: "linkCheckOutcome" }).state === "NOT_MEASURED");`),
    expect: /expected: 'UNMAPPED'\s*\n\s*actual: 'NOT_MEASURED'/ },

  { id: "X10", what: "an absence promoted to PASS (NOT_MEASURED given PASS's edges)", file: VERDICT, test: T, named: "K11 ·",
    from: 'const EDGE_CLASS = Object.freeze({ PASS: "PASS", FAIL: "FAIL", UNKNOWN: "UNKNOWN", NOT_MEASURED: "UNKNOWN", NOT_APPLICABLE: "UNKNOWN" });',
    to: 'const EDGE_CLASS = Object.freeze({ PASS: "PASS", FAIL: "FAIL", UNKNOWN: "UNKNOWN", NOT_MEASURED: "PASS", NOT_APPLICABLE: "UNKNOWN" });',
    probe: probe(`let t = false; try { V.promoteOutcome("NOT_MEASURED", "PASS"); t = true; } catch {} say(t);`),
    expect: /NOT_MEASURED must never become PASS/ },

  { id: "X11", what: "a tracked runs/discovery artefact dropped from the census's declaration (the denominator reopens)", file: CENSUS, test: T, named: "K10 ·",
    from: '  "runs/discovery/search-language-2026-09-15.json": Object.freeze({ reading: "NO_STATE_LITERALS" }),\n',
    to: "",
    probe: probe(`say(!("runs/discovery/search-language-2026-09-15.json" in C.DISCOVERY_ARTEFACTS));`),
    expect: /-\s+'runs\/discovery\/search-language-2026-09-15\.json'/ },

  { id: "X12", what: "the UNKNOWN-for-unmeasured zero made blind", file: CENSUS, test: T, named: "K9 ·",
    from: '    unknownForUnmeasured: items.filter((i) => i.notPerformed && i.state === "UNKNOWN").length,',
    to: "    unknownForUnmeasured: 0,",
    probe: probe(`say(C.correctionZeros([{ notPerformed: true, state: "UNKNOWN", unmapped: false, basis: "CHECK_RAN" }]).unknownForUnmeasured === 0);`),
    expect: /\+\s+unknownForUnmeasuredFires: false/ },

  { id: "X13", what: "Row 7's law tolerates UNKNOWN on a CURRENT result (the old label read as NOT_MEASURED)", file: WRITER, test: T, named: "K4b ·",
    from: " : x.state);",
    to: ' : (x.state === "UNKNOWN" ? NOT_MEASURED : x.state));',
    probe: probe(`const r = W.measureMarket(STORE()); const x = clone(r); x.dimensions.WORTHINESS.state = "UNKNOWN"; say(W.marketErrors({ result: x, storeRecords: STORE() }).length === 0);`),
    expect: /-\s+'third-dimension-filled'/ },

  { id: "X14", what: "the NOT_APPLICABLE-collapse zero made blind", file: CENSUS, test: T, named: "K9 ·",
    from: '    notApplicableCollapsedIntoUnknown: items.filter((i) => i.inapplicable && i.state === "UNKNOWN").length,',
    to: "    notApplicableCollapsedIntoUnknown: 0,",
    probe: probe(`say(C.correctionZeros([{ inapplicable: true, state: "UNKNOWN", unmapped: false, basis: "CHECK_RAN" }]).notApplicableCollapsedIntoUnknown === 0);`),
    expect: /\+\s+notApplicableCollapseFires: false/ },

  { id: "X15", what: "the ambiguous-mapping zero made blind", file: CENSUS, test: T, named: "K9 ·",
    from: "    ambiguousAutomaticMappings: items.filter((i) => !i.unmapped && !POSITIVE_BASES.includes(i.basis)).length,",
    to: "    ambiguousAutomaticMappings: 0,",
    probe: probe(`say(C.correctionZeros([{ state: "UNKNOWN", unmapped: false, basis: "LABEL_ALONE" }]).ambiguousAutomaticMappings === 0);`),
    expect: /\+\s+ambiguousMappingFires: false/ },

  { id: "X16", what: "the remainder zero made blind", file: CENSUS, test: T, named: "K9 ·",
    from: "    remainder: items.length - placedOrUnmapped,",
    to: "    remainder: 0,",
    probe: probe(`say(C.correctionZeros([{ state: undefined, unmapped: false, basis: "CHECK_RAN" }]).remainder === 0);`),
    expect: /\+\s+remainderFires: false/ },
];

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
  const outArg = (process.argv.find((a) => a.startsWith("--out=")) ?? "").slice(6);
  const list = only.length ? F06_CORRECTION_SABOTAGES.filter((s) => only.includes(s.id)) : F06_CORRECTION_SABOTAGES;
  const cleanProbe = list.map((s) => {
    let out = "";
    try { out = execFileSync(process.execPath, ["--input-type=module", "-e", s.probe], { cwd: REPO, encoding: "utf8" }); } catch (e) { out = `ERROR ${e.message}`; }
    return { id: s.id, clean: /DEFECT_TOOK_EFFECT:false/.test(out) };
  });
  const bad = cleanProbe.filter((p) => !p.clean);
  console.log(`probe control on the clean tree: ${cleanProbe.length - bad.length} of ${cleanProbe.length} report no defect${bad.length ? ` — 🔴 ${bad.map((p) => p.id).join(", ")}` : ""}`);
  console.log("F06 CORRECTION · SABOTAGE — ran · landed (bytes AND behaviour) · named test RED · intended reason · restored\n");
  const run = runSabotages(list);
  const ran = run.results.filter((r) => !String(r.verdict).startsWith("NOT RUN")).length;
  const landed = run.results.filter((r) => r.landed === true && r.tookEffect === true).length;
  const proved = run.results.filter((r) => r.verdict === "RED, named test, intended reason" && r.restoredClean && r.tookEffect === true).length;
  console.log(`\n${list.length} sabotage(s) · RAN ${ran} of ${list.length} · LANDED ${landed} of ${list.length} (bytes and behaviour) · PROVED ${proved} · residue ${run.residue.length} · production untouched ${run.productionUntouched}`);
  if (outArg) {
    const head = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const text = renderEvidence(run, { title: "F06 CORRECTION — SABOTAGE EVIDENCE (legacy market measurement · OUTCOME_ALIASES · census)", head })
      + `\nPROBE CONTROL (clean tree): ${cleanProbe.length - bad.length} of ${cleanProbe.length} probes report no defect.\n`
      + run.results.map((r) => `  ${r.id}  ran ${!String(r.verdict).startsWith("NOT RUN")} · bytes landed ${r.landed} · defect took effect ${r.tookEffect} · ${r.verdict} · restored ${r.restoredClean}  — ${r.what}`).join("\n")
      + `\nRAN ${ran} of ${list.length} · LANDED ${landed} of ${list.length} · PROVED ${proved} of ${list.length}\n`;
    writeFileSync(join(REPO, outArg), text);
    console.log(`evidence written: ${outArg}`);
  }
  process.exit(bad.length === 0 && ran === list.length && landed === list.length && proved === list.length && run.residue.length === 0 && run.productionUntouched ? 0 : 1);
}
