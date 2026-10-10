/**
 * 🔴 F45 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs dcb9fbb EVIDENCE; RR-94 §3.3).
 *
 *   node test/helpers/f45-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST (RR-85 §7): every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed
 * before any sabotage runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE,
 * proves it LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail
 * is hashed before and after. Evidence: runs/audit/f45-sabotage-2026-09-30.txt.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FH = "src/facts/fact-health.mjs", LC = "src/facts/lifecycle.mjs", BIN = "bin/fact-health.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = ["test/f45-fact-health.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C1 a contradicted fact is never presented as current", FH, `if (contradicted.has(f.id)) reasons.push("CONTRADICTED");`, "", "C1 ·"],
  ["S2", "C1 differing values of one claim are a contradiction (the reused detector)", LC, "if (values.size < 2) continue;", "if (values.size < 3) continue;", "C1 ·"],
  ["S3", "C2 a fact past its window is EXPIRED", FH, "state: on > due ? FRESHNESS.EXPIRED : FRESHNESS.CURRENT,", "state: FRESHNESS.CURRENT,", "C2 ·"],
  ["S4", "C2 no declared rule is NOT MEASURED", FH, `if (!(Number.isInteger(days) && days > 0)) return { state: FRESHNESS.NOT_MEASURED,`, `if (!(Number.isInteger(days) && days > 0)) return { state: FRESHNESS.CURRENT,`, "C2 ·"],
  ["S5", "C2 no recorded check date is NOT MEASURED", FH, `if (!checked && !factChecked) return { state: FRESHNESS.NOT_MEASURED,`, `if (!checked && !factChecked) return { state: FRESHNESS.CURRENT,`, "C2 ·"],
  ["S6", "C2 two disagreeing check dates are never resolved silently", FH, "if (checked && factChecked && checked !== factChecked) return", "if (false) return", "C2 ·"],
  ["S7", "C2 an earlier recorded recheck date governs", FH, "const due = recorded && recorded < ruleDue ? recorded : ruleDue;", "const due = ruleDue;", "C2 ·"],
  ["S8", "C2 a later recorded recheck date never extends the rule", FH, "const due = recorded && recorded < ruleDue ? recorded : ruleDue;", "const due = recorded ?? ruleDue;", "C2 ·"],
  ["S9", "C2 the judging date is stated, never the clock's", FH, `export function factFreshness(fact, { on }) {\n  if (!ISO.test(on ?? "")) throw`, `export function factFreshness(fact, { on = new Date().toISOString().slice(0, 10) }) {\n  if (false) throw`, "C2 ·"],
  ["S10", "C3 only a sound fact is presented as current", FH, `presentation: reasons.length ? "REVIEW_REQUIRED" : "CURRENT"`, `presentation: "CURRENT"`, "C3 ·"],
  ["S11", "C3 a retired fact is neither judged nor presented", FH, `const active = records.filter((f) => f?.life?.status !== "retired");`, "const active = records;", "C3 ·"],
  ["S12", "C4 a mismatch is MISMATCH", FH, "return { state: r.ok ? RECOMPUTE.MATCH : RECOMPUTE.MISMATCH, inputs: d.inputs };", "return { state: RECOMPUTE.MATCH, inputs: d.inputs };", "C4 ·"],
  ["S13", "C4 a missing input is NOT MEASURED", FH, "if (!d.inputs?.length || inputs.some((f) => !f)) return", "if (false) return", "C4 ·"],
  ["S14", "C4 an undeclared formula is NOT MEASURED", FH, "if (!(d?.formula in FORMULAS)) return", "if (false) return", "C4 ·"],
  ["S15", "C4 a derived fact on a bad input is REVIEW REQUIRED", FH, `if (markedByInput.has(f.id)) reasons.push("AN INPUT IS NOT SOUND");`, "", "C4 ·"],
  ["S16", "C4 the dependency walk is transitive (the reused walk)", LC, `marked.set(f.id, { id: f.id, kind: "derived-fact", becauseOf: hit, reason });\n      grew = true;`, `marked.set(f.id, { id: f.id, kind: "derived-fact", becauseOf: hit, reason });`, "C4 ·"],
  ["S17", "C5 the entry point refuses without a stated date", BIN, `if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(ON ?? "")) {`, "if (false) {", "C5 · THE ENTRY POINT"],
  ["S18", "C5 the entry point prints its bound with the stated date", BIN, "judged on ${r.on} (stated)", "judged on today", "C5 · THE ENTRY POINT"],
  ["S19", "C5 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C5 · the assessment"],
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
  `F45 sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · bound: one span per sabotage, applied ALONE; each run killed after 300 s`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, , n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, , n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
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
  const line = `${id} ${limb} ${file}: landed ${landed} · named test "${expect}" red ${red} · failing ${[...new Set(failing)].length} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
writeFileSync(join(REPO, "runs", "audit", "f45-sabotage-2026-09-30.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
