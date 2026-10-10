/**
 * 🔴 F39 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs 90e798d EVIDENCE; RR-90 §3).
 *
 *   node test/helpers/f39-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST (RR-85 §7): every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed
 * before any sabotage runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE,
 * proves it LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail
 * is hashed before and after. Evidence: runs/audit/f39-sabotage-2026-09-29.txt.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const IG = "src/page/information-gain.mjs", CO = "src/page/construct.mjs", GP = "src/page/existing-page-population.mjs", BIN = "bin/page-information-gain.mjs";
const CP = "tools/need-coverage-call-paths.mjs", PPC = "config/page-production.mjs", NC = "subjects/almi-oet/tools/nursing-chain.mjs";
const T = ["test/f39-information-gain.test.mjs", "test/page-construction.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C1/C2 templates BEYOND needs a recorded gain", IG, `measured.shell.state === "HAS_UNIQUE_TEXT" && gain ? verdict("BEYOND"`, `measured.shell.state === "HAS_UNIQUE_TEXT" ? verdict("BEYOND"`, "C1 ·"],
  ["S2", "C2 current pages BEYOND needs a recorded gain", IG, `pairs.every((p) => p.semantic.state === "DISTINCT") && gain ? verdict("BEYOND"`, `pairs.every((p) => p.semantic.state === "DISTINCT") ? verdict("BEYOND"`, "C2 ·"],
  ["S3", "C2 a gain record names a G12 kind", IG, "G12_KINDS.includes(r.kind) && ", "", "C2 ·"],
  ["S4", "C2 a gain record says what it adds", IG, `typeof r.adds === "string" && r.adds.trim() !== "" && `, "", "C2 ·"],
  ["S5", "C3 SHELL ONLY is NOT BEYOND templates", IG, `measured.shell.state === "SHELL_ONLY" ? verdict("NOT_BEYOND"`, `false ? verdict("NOT_BEYOND"`, "C3 ·"],
  ["S6", "C3 an exact duplicate is NOT BEYOND current pages", IG, `measured.exact.state === "EXACT_DUPLICATE" ? verdict("NOT_BEYOND"`, `false ? verdict("NOT_BEYOND"`, "C3 ·"],
  ["S7", "C3 a reviewed duplicate is NOT BEYOND current pages", IG, `: reviewedDup ? verdict("NOT_BEYOND"`, `: false ? verdict("NOT_BEYOND"`, "C3 ·"],
  ["S8", "C3 a recorded no-gain comparison is NOT BEYOND competitors", IG, `: cmp.gainBeyond === false ? verdict("NOT_BEYOND"`, `: false ? verdict("NOT_BEYOND"`, "C3 ·"],
  ["S9", "C3 any NOT BEYOND is REFUSED", IG, `const outcome = states.includes("NOT_BEYOND") ? GAIN_OUTCOME.REFUSED`, `const outcome = false ? GAIN_OUTCOME.REFUSED`, "C3 ·"],
  ["S10", "C4 no recorded comparison is NOT MEASURED", IG, `b.competitors = !cmp ? verdict("NOT_MEASURED", [], MISSING.COMPETITORS)`, `b.competitors = !cmp ? verdict("BEYOND", ["assumed"])`, "C4 ·"],
  ["S11", "C4 a comparison must name a competitor compared", IG, "Number(cmp.competitorsCompared) >= 1", "Number(cmp.competitorsCompared) >= 0", "C4 ·"],
  ["S12", "C5 CANNOT DECIDE names every missing fact", IG, "missing: Object.freeze(outcome === GAIN_OUTCOME.CANNOT_DECIDE ? missing : []),", "missing: Object.freeze([]),", "C5 ·"],
  ["S13", "C5 unmeasured never becomes a verdict", IG, "    : GAIN_OUTCOME.CANNOT_DECIDE;", "    : GAIN_OUTCOME.REFUSED;", "C5 ·"],
  ["S14", "C7 an unverified body measures nothing", IG, `for (const k of BASELINES) b[k] = verdict("NOT_MEASURED", [], MISSING.BODY);`, `for (const k of BASELINES) b[k] = verdict("BEYOND", ["assumed"]);`, "C7 · an unverified"],
  ["S15", "C7 evidence is passed, never defaulted", IG, `throw new TypeError("gain evidence must be passed explicitly`, `return; throw new TypeError("gain evidence must be passed explicitly`, "C7 · an unverified"],
  ["S16", "C6 the tools' gate needs gain ESTABLISHED", GP, "mayProduce: mayProduceCandidate(decision, rte) && informationGain.outcome === GAIN_OUTCOME.ESTABLISHED,", "mayProduce: mayProduceCandidate(decision, rte),", "C6 ·"],
  ["S17", "C6 construction accepts only an ESTABLISHED gain", CO, "state: gain.outcome === GAIN_OUTCOME.ESTABLISHED ? PASS : gain.outcome === GAIN_OUTCOME.REFUSED ? FAIL : NOT_TESTED,", "state: PASS,", "F36 · C1"],
  ["S18", "C6 no verified population is never 'no other current page'", CO, "const currentPages = existingPages?.inventory ? verifiedPages(existingPages) : null;", "const currentPages = existingPages?.inventory ? verifiedPages(existingPages) : [];", "F36 · C1"],
  ["S19", "C6 the census holds F39 on construction", PPC, `"rightToExist({", "informationGainForCandidate(", "state: gain.outcome === GAIN_OUTCOME.ESTABLISHED ? PASS"]`, `"rightToExist({"]`, "C6 ·"],
  ["S20", "C6 a tool that skips F39 is a census fault", NC, "html: candidateHtml, gainEvidence: NO_RECORDED_GAIN_EVIDENCE", "html: candidateHtml", "C6 ·"],
  ["S21", "C5/C7 the entry point prints its bound", BIN, "console.log(`  bound            ${r.bound}`);", "console.log(\"  bound\");", "C5/C7 · THE ENTRY POINT"],
  ["S22", "C7 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C7 · the decision"],
];

const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const occurrences = (text, s) => text.split(s).length - 1;
const preflight = SABOTAGES.map(([id, , file, from]) => [id, file, occurrences(originals.get(file).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const lines = [
  `F39 sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(", ")} · bound: one span per sabotage, applied ALONE; each run killed after 300 s`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, , n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, , n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
let proved = 0;
for (const [id, limb, file, from, to, expect] of SABOTAGES) {
  const orig = originals.get(file);
  const text = orig.toString("utf8");
  if (occurrences(text, from) !== 1) { lines.push(`${id} ${limb} ${file}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); continue; }
  const at = text.indexOf(from);
  writeFileSync(join(REPO, file), text.slice(0, at) + to + text.slice(at + from.length), "utf8");
  const landed = sha(read(file)) !== sha(orig);
  let failing = [];
  try {
    const r = spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 300000 });
    failing = [...`${r.stdout}${r.stderr}`.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]);
  } finally {
    writeFileSync(join(REPO, file), orig);
  }
  const restored = sha(read(file)) === sha(orig);
  const red = failing.some((n) => n.startsWith(expect));
  const ok = landed && red && restored;
  if (ok) proved += 1;
  lines.push(`${id} ${limb} ${file}: landed ${landed} · named test "${expect}" red ${red} · failing ${[...new Set(failing)].length} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`);
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
writeFileSync(join(REPO, "runs", "audit", "f39-sabotage-2026-09-29.txt"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
