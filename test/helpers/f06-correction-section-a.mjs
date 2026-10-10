/* F06 CORRECTION §A — the proof, committed so it can be re-run. Run it on a checkout of main e11d143 (NOT a worktree:
 * the repository's census resolves its external root from the checkout). On a corrected tree it reports the two paths
 * REACHED, by design — the correction put them into the census. Evidence: runs/audit/f06-correction-section-a-2026-09-24.txt */
// §A by execution, at main e11d143: was OUTCOME_ALIASES (src/evidence/verdict.mjs) or the Row 7 writer
// (src/discovery/market-measurement.mjs) or any runs/discovery artefact REACHED by the F06 census?
//
//   clean      census, traced (every module loaded, every file path read)
//   sabotageA  the OUTCOME_ALIASES path THROWS WHEN CALLED (toCheckOutcome · judgeSupersession · promoteOutcome), and
//              market-measurement.mjs THROWS ON LOAD; census again, traced
//   controlB   judgeLeavingUnknown THROWS WHEN CALLED — recorded as a finding: it did NOT differ, because the facts
//              validator (F23/F24) runs in the registry's own census(), never in this census; it is not a control
//   controlC   the production adapter evidenceStateOf THROWS WHEN CALLED — the firing control: the census calls it
//   OUTSIDE ⇔ sabotageA stdout byte-identical to clean, exit identical, no runs/discovery path read, AND controlC differs.
// Positive controls: each sabotage fires on a direct call (LANDED); the tracer records files the census is known to read.
// Bytes are restored in `finally`, and the restored sha256 is compared to the original.
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SCRATCH = tmpdir().replace(/\\/g, "/");
const TRACE = `${REPO}/test/helpers/module-file-trace.mjs`;
const V = "src/evidence/verdict.mjs";
const M = "src/discovery/market-measurement.mjs";
const A = "src/evidence/evidence-state-adapters.mjs";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const out = [];
const say = (s) => { out.push(s); console.log(s); };
const node = (args, env = {}) => spawnSync(process.execPath, args, { cwd: REPO, encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024 });

say(`engine HEAD ${spawnSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim()}`);

function census(tag) {
  const traceOut = `${SCRATCH}/sectionA-trace-${tag}.json`;
  const r = node(["--import", `file:///${TRACE}`, "tools/evidence-state-census.mjs"], { TRACE_OUT: traceOut });
  return { tag, status: r.status, stdout: r.stdout, stderr: r.stderr, trace: JSON.parse(readFileSync(traceOut, "utf8")) };
}
function callSabotage(src, fns, label) {
  let s = src;
  for (const f of fns) {
    const sig = new RegExp(`export function ${f}\\(([^)]*)\\) \\{`);
    if (!sig.test(s)) throw new Error(`signature of ${f} not found — sabotage would not land`);
    s = s.replace(sig, (m) => `${m} throw new Error("F06 CORRECTION SECTION A ${label} - ${f} CALLED");`);
  }
  return s;
}
const probeCall = (expr) => node(["--input-type=module", "-e", `import * as v from "./${V}"; try { ${expr}; console.log("NO-THROW"); } catch (e) { console.log(e.message); }`]).stdout.trim();

const original = { [V]: readFileSync(`${REPO}/${V}`, "utf8"), [M]: readFileSync(`${REPO}/${M}`, "utf8"), [A]: readFileSync(`${REPO}/${A}`, "utf8") };
const runs = {};
const landed = {};
try {
  runs.clean = census("clean");

  writeFileSync(`${REPO}/${V}`, callSabotage(original[V], ["toCheckOutcome", "judgeSupersession", "promoteOutcome"], "SABOTAGE-A"));
  writeFileSync(`${REPO}/${M}`, `throw new Error("F06 CORRECTION SECTION A SABOTAGE-A - ${M} WAS LOADED");\n` + original[M]);
  landed.toCheckOutcome = /SABOTAGE-A - toCheckOutcome CALLED/.test(probeCall(`v.toCheckOutcome("pass")`));
  landed.judgeSupersession = /SABOTAGE-A - judgeSupersession CALLED/.test(probeCall(`v.judgeSupersession({previous:{},next:{}})`));
  landed.promoteOutcome = /SABOTAGE-A - promoteOutcome CALLED/.test(probeCall(`v.promoteOutcome("pass","pass")`));
  landed.marketModule = /SABOTAGE-A/.test(node(["-e", `import("./${M}").then(()=>console.log("NO-THROW"),(e)=>console.log(e.message))`]).stdout);
  runs.sabotageA = census("sabotageA");

  writeFileSync(`${REPO}/${V}`, callSabotage(original[V], ["judgeLeavingUnknown"], "CONTROL-B"));
  writeFileSync(`${REPO}/${M}`, original[M]);
  landed.judgeLeavingUnknown = /CONTROL-B - judgeLeavingUnknown CALLED/.test(probeCall(`v.judgeLeavingUnknown("x",{previous:{state:"UNKNOWN"}})`));
  runs.controlB = census("controlB");

  // controlC — the same call-sabotage shape on a function the census DOES call (the production adapter).
  writeFileSync(`${REPO}/${V}`, original[V]);
  writeFileSync(`${REPO}/${A}`, callSabotage(original[A], ["evidenceStateOf"], "CONTROL-C"));
  landed.evidenceStateOf = /CONTROL-C - evidenceStateOf CALLED/.test(node(["--input-type=module", "-e", `import * as a from "./${A}"; try { a.evidenceStateOf({}); console.log("NO-THROW"); } catch (e) { console.log(e.message); }`]).stdout);
  runs.controlC = census("controlC");
} finally {
  writeFileSync(`${REPO}/${V}`, original[V]);
  writeFileSync(`${REPO}/${M}`, original[M]);
  writeFileSync(`${REPO}/${A}`, original[A]);
}
for (const t of [V, M, A]) say(`restored ${t}: sha256 ${sha(readFileSync(`${REPO}/${t}`, "utf8")) === sha(original[t]) ? "IDENTICAL" : "DIFFERENT (!!)"}`);
const st = spawnSync("git", ["-C", REPO, "status", "--porcelain", "--", V, M, A], { encoding: "utf8" }).stdout.trim();
say(`git status on the three files after restore: ${st === "" ? "clean" : st}`);
say("");
say(`positive control — every sabotage LANDED on a direct call: ${Object.entries(landed).map(([k, b]) => `${k}=${b}`).join(" · ")}`);
const knownRead = ["runs/audit/findings.jsonl", "runs/cost/ledger.jsonl"];
for (const r of Object.values(runs)) {
  const files = r.trace.files.map((f) => f.replace(/\\/g, "/"));
  const mods = r.trace.modules;
  say(`[${r.tag}] exit ${r.status} · stdout ${r.stdout.length} bytes · modules ${mods.length} · file paths ${files.length}`);
  say(`[${r.tag}]   tracer positive control — known reads seen: ${knownRead.map((k) => `${k}=${files.some((f) => f.endsWith(k))}`).join(" · ")}`);
  say(`[${r.tag}]   verdict.mjs loaded ${mods.some((m) => m.endsWith("/src/evidence/verdict.mjs"))} · market-measurement.mjs loaded ${mods.some((m) => m.endsWith("/src/discovery/market-measurement.mjs"))} · runs/discovery paths read ${files.filter((f) => /runs\/discovery/.test(f)).length}`);
  if (r.status !== 0) say(`[${r.tag}]   stderr: ${(r.stderr.match(/Error: [^\n]*/) ?? ["(none)"])[0]}`);
}
say("");
say(`sabotageA vs clean: exit identical ${runs.sabotageA.status === runs.clean.status} · stdout byte-identical ${runs.sabotageA.stdout === runs.clean.stdout}`);
say(`controlB vs clean:  exit identical ${runs.controlB.status === runs.clean.status} · stdout byte-identical ${runs.controlB.stdout === runs.clean.stdout}  (judgeLeavingUnknown is not on the census call path)`);
say(`controlC vs clean:  exit identical ${runs.controlC.status === runs.clean.status} · stdout byte-identical ${runs.controlC.stdout === runs.clean.stdout}  (must DIFFER — the firing control for the call-sabotage method)`);
const committed = readFileSync(`${REPO}/runs/audit/f06-populations-and-censuses-2026-09-24.txt`, "utf8").replace(/\r\n/g, "\n");
const popLines = (s) => s.replace(/\r\n/g, "\n").split("\n").filter((l) => /^  (engine|batch|research|facts|costParts):/.test(l));
const a = popLines(runs.clean.stdout), c = popLines(committed);
say(`population lines: clean ${a.length} · committed ${c.length} · identical ${JSON.stringify(a) === JSON.stringify(c)} · naming discovery/market: ${a.filter((l) => /discovery|market/i.test(l)).length}/${c.filter((l) => /discovery|market/i.test(l)).length}`);
