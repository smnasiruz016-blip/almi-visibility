/**
 * 🔴 F87 · THE WATCHMAN · ONE SABOTAGE PER SAFEGUARD (RR-129 §4).
 *
 *   node test/helpers/f87-sabotage.mjs --deliberate      NOT part of `npm test`
 *
 * PRE-FLIGHT: every span exactly once in the code live now. Each sabotage alone; the named test must fail by an assertion (a SyntaxError
 * is a harness fault, never a proof); restored by raw-byte sha256; the production trail hashed before and after.
 * Evidence: runs/audit/f87-sabotage-rr129-2026-10-02.txt (its own file).
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const W = "src/ops/watchman.mjs", R = "src/ops/watchman-reader.mjs", B = "bin/watchman.mjs";
const T = ["test/f87-watchman.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const C1 = "C1 · FIXTURE · FIRING CONTROL", C2 = "C2 · FIXTURE · FIRING CONTROL", C3 = "C3 · FIXTURE · FIRING CONTROL", C4 = "C4 · FIXTURE · FIRING CONTROL";
const LOSS = "C5 · FIXTURE · FIRING CONTROL: an ALLOWED write", REC = "C5 · FIXTURE · FIRING CONTROL: recovery is PROVED", ALERT = "C6 · C7 · FIXTURE", REAL = "REAL · the engine's recorded operations", TORN = "C5 · FIXTURE · the reader reports", ENTRY = "C7 · THE ENTRY POINT";

const SABOTAGES = [
  ["W1", "a cost entry with no outcome is NOT MEASURED", W, "    else cost[NOT_MEASURED] += 1;", "    else {}", C1],
  ["W2", "the LATEST correction governs, whatever the record order", W, "    .sort((a, b) => String(a.corrected_at ?? \"\").localeCompare(String(b.corrected_at ?? \"\")));", "    ;", C1],
  ["W3", "a recorded correction is applied", W, "return { state: mine.length ? mine[mine.length - 1].corrected_value : run.coverageState, corrected: mine.length > 0 };", "return { state: run.coverageState, corrected: mine.length > 0 };", C1],
  ["W4", "UNKNOWN coverage is NOT MEASURED, never complete", W, "const coverageClass = (s) => (s === \"COMPLETE\" || s === \"PARTIAL\" ? s : NOT_MEASURED);", "const coverageClass = (s) => (s === \"PARTIAL\" ? s : \"COMPLETE\");", C1],
  ["W5", "FORBIDDEN is UNAVAILABLE even beside a data state", W, "r[v.authState === \"FORBIDDEN\" ? \"UNAVAILABLE\" : v.dataState === \"COMPLETE\" ? \"AVAILABLE\" : NOT_MEASURED] += 1;", "r[v.dataState === \"COMPLETE\" ? \"AVAILABLE\" : v.authState === \"FORBIDDEN\" ? \"UNAVAILABLE\" : NOT_MEASURED] += 1;", C2],
  ["W6", "a retrieval with no result is counted neither way", W, "v.result === \"SUCCESS\" ? \"AVAILABLE\" : NOT_MEASURED] += 1;", "\"AVAILABLE\"] += 1;", C2],
  ["W7", "a claim observation is not a retrieval", W, "if (v.kind !== \"external_page_retrieval\") { outside += 1; continue; }", "if (false) { outside += 1; continue; }", C2],
  ["W8", "an output with no recorded state is NOT MEASURED", W, "const s = state === \"COMPLETE\" || state === \"PARTIAL\" ? state : NOT_MEASURED;", "const s = state === \"PARTIAL\" ? state : \"COMPLETE\";", C3],
  ["W9", "a PARTIAL is counted with its recorded reason, an empty reason is none", W, "out[typeof reason === \"string\" && reason.trim() !== \"\" ? \"partialWithReason\" : \"partialWithoutReason\"] += 1;", "out.partialWithReason += 1;", C3],
  ["W10", "evidence with no declared window, or no registry, is never fresh", W, "const unmeasured = (freshness?.NOT_MEASURED ?? 0) + otherEvidence + (f ? 0 : 1);", "const unmeasured = (freshness?.NOT_MEASURED ?? 0);", C4],
  ["W11", "the judging date is stated, never defaulted", W, "  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(on ?? \"\")) throw new TypeError(\"the judging date must be stated (YYYY-MM-DD) — never the clock's default\");", "  if (false) throw new TypeError(\"x\");", C4],
  ["W12", "an attempt with no terminal is a SILENT LOSS", W, "  r.silentLoss += open.size;", "  r.silentLoss += 0;", LOSS],
  ["W13", "a re-attempt never hides the first attempt's lost outcome", W, "r.allowed += 1; if (open.has(key)) r.silentLoss += 1; open.set(key, true); continue; }", "r.allowed += 1; open.set(key, true); continue; }", LOSS],
  ["W14", "a refusal BEFORE the attempt is no outcome for it (order)", W, "      if (!open.has(key)) { if (phase === SAGA.REFUSED) r.refusedBeforeAttempt += 1; else r.unclassified += 1; continue; }", "      if (!open.has(key)) { open.set(key, true); }", LOSS],
  ["W15", "an unreadable trail line is never read as no write", W, "  r.unclassified += malformedLines;", "  r.unclassified += 0;", TORN],
  ["W16", "a FAILED outcome is a recorded failure, not silent", W, "      else { r.recordedFailures += 1; failed.set(key, phase); }", "      else { r.silentLoss += 1; }", REC],
  ["W17", "a retry that commits recovers the failure", W, "if (phase === SAGA.COMMITTED) { r.applied += 1; if (failed.has(key)) { r.recovered += 1; failed.delete(key); } }", "if (phase === SAGA.COMMITTED) { r.applied += 1; }", REC],
  ["W18", "no real failure: recovery is UNPROVED, never PROVED", W, "    : r.recordedFailures > 0 && r.recovered === r.recordedFailures ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE;", "    : r.recovered === r.recordedFailures ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE;", REC],
  ["W19", "a failed recovery disproves", W, "const recoveryVerdict = r.recoveryFailed > 0 ? VERDICT.DISPROVED", "const recoveryVerdict = false ? VERDICT.DISPROVED", REC],
  ["W20", "every alert carries its denominator", W, ".map(([condition, count, denominator]) => ({ condition, count, denominator }));", ".map(([condition, count]) => ({ condition, count }));", ALERT],
  ["W21", "no alert is claimed sent", W, "export const ALERT_SENDING = \"NOT BUILT — no alert channel is declared; every alert below is printed, none is sent\";", "export const ALERT_SENDING = \"SENT\";", ALERT],
  ["W22", "an empty population never reads PROVED", W, "defects > 0 ? VERDICT.DISPROVED : unmeasured === 0 && size > 0 ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE;", "defects > 0 ? VERDICT.DISPROVED : unmeasured === 0 ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE;", C1],
  ["W23", "the whole reads PROVED only when every part does", W, ": verdicts.every((v) => v === VERDICT.PROVED) ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE,", ": verdicts.every((v) => v !== VERDICT.DISPROVED) ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE,", ALERT],
  ["W24", "an incomplete population is reported incomplete", W, "parts, alerts, alertSending: ALERT_SENDING, absent, incomplete: absent.length > 0,", "parts, alerts, alertSending: ALERT_SENDING, absent, incomplete: false,", ALERT],
  ["W25", "unproved recovery is named among the absences", W, "    recovery.recordedFailures === 0 && `recovery: ${recovery.recoveryWhy}`,", "    false,", ALERT],
  ["W26", "the reader reads every recorded correction", R, "  const corrections = batch.filter((r) => r.record_type === \"crawl_run_correction\");", "  const corrections = [];", REAL],
  ["W27", "the reader counts an unreadable trail line", R, "    trailMalformedLines: trail.malformedLines.length,", "    trailMalformedLines: 0,", TORN],
  ["W28", "the entry point refuses a run with no stated date", B, "if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(ON ?? \"\")) {", "if (false) {", ENTRY],
];

const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const occurrences = (text, s) => text.split(s).length - 1;
const preflight = SABOTAGES.map(([id, , file, from]) => [id, occurrences(originals.get(file).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const lines = [
  `F87 watchman sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · each applied ALONE; each run killed after 300 s`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, file, from, to, expect] of SABOTAGES) {
  const orig = originals.get(file);
  const text = orig.toString("utf8");
  if (occurrences(text, from) !== 1) { lines.push(`${id} ${limb} ${file}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); console.log(lines.at(-1)); continue; }
  const at = text.indexOf(from);
  writeFileSync(join(REPO, file), text.slice(0, at) + to + text.slice(at + from.length), "utf8");
  const landed = sha(read(file)) !== sha(orig);
  let failing = [], reasons = "";
  try {
    const r = spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 300000 });
    failing = [...`${r.stdout}${r.stderr}`.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]);
    reasons = [...new Set([...`${r.stdout}${r.stderr}`.matchAll(/^\s+(AssertionError|TypeError|ReferenceError|SyntaxError|Error)\b/gm)].map((m) => m[1]))].join("/") || "none";
  } finally {
    writeFileSync(join(REPO, file), orig);
  }
  const restored = sha(read(file)) === sha(orig);
  const red = failing.some((n) => n.startsWith(expect));
  const ok = landed && red && restored && !/SyntaxError/.test(reasons);
  if (ok) proved += 1;
  const line = `${id} ${limb} ${file}: landed ${landed} · named test red ${red} · failing ${[...new Set(failing)].length} · reason ${reasons} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
restoreAll();
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
writeFileSync(join(REPO, "runs", "audit", "f87-sabotage-rr129-2026-10-02.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
