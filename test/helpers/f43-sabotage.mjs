/**
 * 🔴 F43 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs 6c7627a EVIDENCE; RR-91 §3).
 *
 *   node test/helpers/f43-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST (RR-85 §7): every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed
 * before any sabotage runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE,
 * proves it LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail
 * is hashed before and after. Evidence: runs/audit/f43-sabotage-2026-09-29.txt.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CD = "src/page/content-decay.mjs", EV = "src/page/content-decay-evidence.mjs", AE = "src/page/action-evidence.mjs", BIN = "bin/page-decay.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = "test/f43-content-decay.test.mjs";
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C6 age only from a recorded publication date", CD, "const age = iso(publishedOn) && performance && iso(performance.windowEnd) ? daysBetween(publishedOn, performance.windowEnd) : null;", "const age = performance && iso(performance.windowEnd) ? daysBetween(publishedOn ?? performance.windowStart, performance.windowEnd) : null;", "C6 ·"],
  ["S2", "C6 no recorded age is never 'too new'", CD, "else if (age === null) state = EVALUATION.NOT_MEASURED;", "else if (age === null) state = EVALUATION.TOO_EARLY;", "C6 ·"],
  ["S3", "C1 a blocker is resolved before demand is judged", CD, `if (technical?.state === "BLOCKED") { state = EVALUATION.BLOCKED;`, "if (false) { state = EVALUATION.BLOCKED;", "C1 ·"],
  ["S4", "C1 no judgement before 28 days", CD, "else if (age < MIN_DAYS) {", "else if (age < 0) {", "C1 ·"],
  ["S5", "C1 an unknown technical state is not clear", CD, `else if (technical?.state !== "CLEAR") state = EVALUATION.NOT_MEASURED;`, "else if (false) state = EVALUATION.NOT_MEASURED;", "C1 ·"],
  ["S6", "C1 evaluation needs 100 impressions", CD, "else if (performance.impressions >= MIN_IMPRESSIONS) { state = EVALUATION.EVALUABLE;", "else if (performance.impressions >= 1) { state = EVALUATION.EVALUABLE;", "C1 ·"],
  ["S7", "C1 the fallback review is at day 90", CD, "else if (age >= FALLBACK_DAYS) { state = EVALUATION.FALLBACK_REVIEW;", "else if (age >= MIN_DAYS) { state = EVALUATION.FALLBACK_REVIEW;", "C1 ·"],
  ["S8", "C2 WEAK only at the fallback review", CD, `const result = state === EVALUATION.FALLBACK_REVIEW ? "WEAK"`, `const result = state !== EVALUATION.EVALUABLE ? "WEAK"`, "C2 ·"],
  ["S9", "C3 a WEAK page is improved once first", CD, "if (!improvement || !iso(improvement.on)) workflow =", "if (false) workflow =", "C3 ·"],
  ["S10", "C3 the re-measurement ends 28 days after the improvement", CD, "daysBetween(improvement.on, remeasure.windowEnd) < MIN_DAYS || ", "", "C3 ·"],
  ["S11", "C3 the re-measurement starts after the improvement", CD, " || Date.parse(remeasure.windowStart) < Date.parse(improvement.on)", "", "C3 ·"],
  ["S12", "C3 only a still-WEAK page yields noindex evidence", CD, "} else if (remeasure.impressions < MIN_IMPRESSIONS) {", "} else if (true) {", "C3 ·"],
  ["S13", "C4 removal needs all three facts", CD, "const removal = notServed && noSuccessor && noDemand", "const removal = notServed && noDemand", "C4 ·"],
  ["S14", "C6 no demand needs a recorded age of 90 days", CD, "const noDemand = performance && age !== null && age >= FALLBACK_DAYS && performance.impressions === 0", "const noDemand = performance && performance.impressions === 0", "C6 ·"],
  ["S15", "C5 F35 reads F43's post-publication evidence", AE, "postPublication: decay.get(p.pageId)?.postPublication ?? null,", "postPublication: null,", "C5 · REAL structures"],
  ["S16", "C6 the real reader never infers age", EV, "publishedOn: pub?.publishedOn ?? null,", "publishedOn: pub?.publishedOn ?? perf.window?.start ?? null,", "REAL ·"],
  ["S17", "C7 decay evidence is passed, never defaulted", EV, " || !Array.isArray(d.indexing)) {", ") {", "C7 · THE ENTRY POINT"],
  ["S18", "C7 the entry point prints its bound", BIN, "console.log(`  bound            ${r.bound}`);", "console.log(\"  bound\");", "C7 · THE ENTRY POINT"],
  ["S19", "C7 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C7 · the assessment"],
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
  `F43 sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T} · bound: one span per sabotage, applied ALONE; each run killed after 300 s`,
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
    const r = spawnSync(process.execPath, ["--test", T], { cwd: REPO, encoding: "utf8", timeout: 300000 });
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
writeFileSync(join(REPO, "runs", "audit", "f43-sabotage-2026-09-29.txt"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
