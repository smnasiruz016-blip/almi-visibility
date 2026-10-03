/**
 * 🔴 RR-150 · F62 APPLICABILITY WRITER · ONE SABOTAGE PER LIMB (acceptance _handoffs a5ec9f1).
 *
 *   node test/helpers/f62-assessment-sabotage.mjs      NOT part of `npm test`
 *
 * BASELINE: the test file must be wholly GREEN before any sabotage, or nothing is run. PRE-FLIGHT: every span exactly once in the code
 * live now. Each sabotage alone; the named test must fail by an ASSERTION (a crash is a harness fault, never a proof); restored by raw-byte
 * sha256; the production trail hashed before and after.
 * Evidence: runs/audit/f62-assessment-sabotage-rr150-2026-10-03.txt — its own file; it refuses to overwrite one that exists.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const EVIDENCE = join(REPO, "runs", "audit", process.env.F62_EVIDENCE_NAME ?? "f62-assessment-sabotage-rr150-2026-10-03.txt");
if (existsSync(EVIDENCE)) { console.error(`refused: ${EVIDENCE} exists — an earlier run's evidence is never overwritten; name a new file with F62_EVIDENCE_NAME`); process.exit(2); }
const AS = "src/research/applicability-assessment.mjs", BX = "bin/applicability-assess.mjs", ES = "src/evidence/evidence-state-adapters.mjs";
const T = ["test/f62-assessment.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const W1 = "W1 ·", W2 = "W2 ·", W3 = "W3 ·", W4 = "W4 ·", W5 = "W5 ·", W6 = "W6 ·", W7 = "W7 ·", W8 = "W8 ·", W10 = "W10 ·", E3 = "ENTRY3 ·";

const SABOTAGES = [
  ["X1", "ACCEPTED is never mapped to REQUIRED", AS, "  ACCEPTANCE: OUTCOMES.ACCEPTED,\n", "  ACCEPTANCE: OUTCOMES.REQUIRED,\n", W1],
  ["X2", "a kind gives exactly its own outcome (silence never NOT_REQUIRED)", AS, "if (!Object.hasOwn(KINDS, d?.kind) || KINDS[d.kind] !== d?.outcome) {", "if (!Object.hasOwn(KINDS, d?.kind)) {", W1],
  ["X3", "an UNKNOWN names its missing fact", AS, "if (d.outcome === OUTCOMES.UNKNOWN && !present(d?.missingFact)) {", "if (false) {", W1],
  ["X4", "the evidence must be a record OF that check (no copied scope)", AS, "if (!f || !check.provenance.some((p) => p.factId === f.id)) {", "if (!f) {", W2],
  ["X5", "a check is matched by body AND exact scope", AS, "const check = declaration.checks.find((c) => c.body === d?.check?.body && sameScope(c.scope, d?.check?.scope));", "const check = declaration.checks.find((c) => c.body === d?.check?.body);", W2],
  ["X6", "a stale or undated source is refused at drafting", AS, "if (h?.presentation !== \"CURRENT\") { refuse(d, REFUSAL.STALE_SOURCE", "if (false) { refuse(d, REFUSAL.STALE_SOURCE", W3],
  ["X7", "the excerpt must occur in the stored text", AS, "if (!present(excerpt) || !storedTextOf(f).some((t) => t.includes(excerpt))) {", "if (!present(excerpt)) {", W4],
  ["X8", "a duplicate is refused", AS, "if (seen.has(id)) {", "if (false) {", W5],
  ["X9", "another subject's draft is refused", AS, "if (d?.subject !== subject) {", "if (false) {", W6],
  ["X10", "only a checker declared a person confirms (F46 C3)", AS, "if (!present(checker) || !persons.includes(checker)) return", "if (!present(checker)) return", W7],
  ["X11", "a source stale at confirmation is refused", AS, "if (h?.presentation !== \"CURRENT\") return Object.freeze({ refused: REFUSAL.STALE_SOURCE", "if (false) return Object.freeze({ refused: REFUSAL.STALE_SOURCE", W7],
  ["X12", "the readback counts only confirmations by declared persons", AS, "r?.record_type === CONFIRMATION_RECORD && persons.includes(r.checker)", "r?.record_type === CONFIRMATION_RECORD", W8],
  ["X13", "a PROPOSED assessment is never read back as CONFIRMED", AS, "state: \"PROPOSED\", outcome: OUTCOMES.UNKNOWN, proposedOutcomes", "state: \"CONFIRMED\", outcome: proposed[0].outcome, proposedOutcomes", W8],
  ["X14", "a PROPOSED assessment is INFERRED, never OBSERVED", ES, "return place(rule, \"INFERRED\", { inputRefs: [`fact:${h16(r.evidence.factId)}`]", "return place(rule, \"OBSERVED\", { inputRefs: [`fact:${h16(r.evidence.factId)}`]", W10],
  ["X15", "without --confirm nothing is written", BX, "if (toWrite.length && permission.mayWrite) {", "if (toWrite.length) {", E3],
  ["X16", "the product must be the subject's (no tenant crossover at the entry point)", BX, "if (!members.some((m) => m.resourceKind === \"FACT_REGISTRY\"", "if (false && !members.some((m) => m.resourceKind === \"FACT_REGISTRY\"", E3],
  ["X17", "the roster is the declared one — a recorded id is never treated as a person", BX, "const persons = NO_DECLARED_PERSON_CHECKERS;", "const persons = [\"human:beta-g (Cowork)\"];", E3],
];

const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const runTests = () => {
  const r = spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 300000 });
  const out = `${r.stdout}${r.stderr}`;
  return {
    failing: [...out.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]),
    passing: [...out.matchAll(/✔ (.+?) \(\d/g)].map((m) => m[1]),
    reasons: [...new Set([...out.matchAll(/^\s+(AssertionError|TypeError|ReferenceError|SyntaxError|RangeError|Error)\b/gm)].map((m) => m[1]))],
  };
};
const occurrences = (text, s) => text.split(s).length - 1;
const preflight = SABOTAGES.map(([id, , file, from]) => [id, occurrences(originals.get(file).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const base = runTests();
const named = [...new Set(SABOTAGES.map((s) => s[5]))];
const baselineGreen = base.failing.length === 0 && named.every((n) => base.passing.some((p) => p.startsWith(n)));
const lines = [
  `RR-150 F62 applicability writer sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · each applied ALONE; each run killed after 300 s`,
  `BASELINE (unsabotaged): passing ${base.passing.length} · failing ${base.failing.length} · every named test green: ${baselineGreen}`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
if (!baselineGreen) { console.error("refused: the baseline is not green — a red test cannot prove a sabotage"); process.exit(3); }
let proved = 0;
for (const [id, limb, file, from, to, expect] of SABOTAGES) {
  const orig = originals.get(file);
  const text = orig.toString("utf8");
  if (occurrences(text, from) !== 1) { lines.push(`${id} ${limb} ${file}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); console.log(lines.at(-1)); continue; }
  const at = text.indexOf(from);
  writeFileSync(join(REPO, file), text.slice(0, at) + to + text.slice(at + from.length), "utf8");
  const landed = sha(read(file)) !== sha(orig);
  let r;
  try { r = runTests(); } finally { writeFileSync(join(REPO, file), orig); }
  const restored = sha(read(file)) === sha(orig);
  const red = r.failing.some((n) => n.startsWith(expect));
  const byAssertion = r.reasons.length > 0 && r.reasons.every((x) => x === "AssertionError");
  const ok = landed && red && restored && byAssertion;
  if (ok) proved += 1;
  const line = `${id} ${limb} ${file}: landed ${landed} · named test (${expect}) red ${red} · failing ${[...new Set(r.failing)].length} · reason ${r.reasons.join("+") || "none"} · restored ${restored} · ${ok ? "PROVED" : "NOT PROVED — A FINDING"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
restoreAll();
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(dirname(EVIDENCE), { recursive: true });
writeFileSync(EVIDENCE, lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === SABOTAGES.length ? 0 : 1;
