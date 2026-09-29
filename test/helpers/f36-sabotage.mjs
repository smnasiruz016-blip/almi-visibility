/**
 * 🔴 F36 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs 2635153 EVIDENCE; RR-87 §5).
 *
 *   node test/helpers/f36-sabotage.mjs      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST (RR-85 §7): every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed
 * before any sabotage runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE,
 * proves it LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail
 * is hashed before and after. Evidence: runs/audit/f36-sabotage-2026-09-29.txt.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const RTE = "src/page/right-to-exist.mjs", POP = "src/page/existing-page-population.mjs", CON = "src/page/construct.mjs", NC = "subjects/almi-oet/tools/nursing-chain.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = "test/f36-right-to-exist.test.mjs", PC = "test/page-construction.test.mjs";
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C2 a failed reason refuses", RTE, `const specific = why.state === "PASS" ? { state: "PASS" } : why.state === "FAIL" ? { state: "FAIL", kind: why.kind, reason: why.reason } : { state: "CANNOT_DECIDE", reason: why.reason };`, `const specific = why.state === "FAIL" ? { state: "PASS" } : why.state === "PASS" ? { state: "PASS" } : { state: "CANNOT_DECIDE", reason: why.reason };`, "C1/C2 ·", T],
  ["S2", "C2/C4 an unjudgeable reason cannot decide", RTE, `: { state: "CANNOT_DECIDE", reason: why.reason };`, `: { state: "PASS" };`, "C2/C4 · a sibling with no reason", T],
  ["S3", "C3 a covered need refuses creation", RTE, `const covered = decision.needCoverage?.outcome === "COVERED" || decision.outcome === EXISTING_PAGE_OUTCOMES.IMPROVE || decision.reason === "AN_EXISTING_PAGE_SERVES_THIS_INTENT";`, "const covered = false;", "C3 ·", T],
  ["S4", "C3 no decision is not 'not served'", RTE, `if (!decision || typeof decision !== "object") return { state: "CANNOT_DECIDE", reason: "NO_EXISTING_PAGE_DECISION" };`, `if (!decision || typeof decision !== "object") return { state: "PASS", reason: "NO_EXISTING_PAGE_DECISION" };`, "C3 ·", T],
  ["S5", "C3 an unserved need passes", RTE, "if (decision.mayProduce) return { state: \"PASS\", reason: decision.reason, outcome: decision.outcome };", "if (false) return { state: \"PASS\", reason: decision.reason, outcome: decision.outcome };", "C2/C4 · a specific reason and an unserved need", T],
  ["S6", "C4 a named failure outranks a missing judgement", RTE, "const outcome = failed.length ? RIGHT_TO_EXIST.REFUSED : undecided.length ? RIGHT_TO_EXIST.CANNOT_DECIDE : RIGHT_TO_EXIST.ESTABLISHED;", "const outcome = undecided.length ? RIGHT_TO_EXIST.CANNOT_DECIDE : failed.length ? RIGHT_TO_EXIST.REFUSED : RIGHT_TO_EXIST.ESTABLISHED;", "C4 ·", T],
  ["S7", "C4 the unmeasured residue is carried", RTE, "checks: why.checks, notMeasured: NOT_MEASURED_RESIDUE });", "checks: why.checks, notMeasured: null });", "C2/C4 · a specific reason and an unserved need", T],
  ["S8", "C1 the gate's rule needs ESTABLISHED", RTE, "return Boolean(existingPageDecision?.mayProduce) && rte?.outcome === RIGHT_TO_EXIST.ESTABLISHED;", "return Boolean(existingPageDecision?.mayProduce);", "C1 · the gate's rule", T],
  ["S9", "C1 the tools' gate applies the rule", POP, "mayProduce: mayProduceCandidate(decision, rte) && informationGain.outcome === GAIN_OUTCOME.ESTABLISHED,", "mayProduce: decision.mayProduce && informationGain.outcome === GAIN_OUTCOME.ESTABLISHED,", "C1 · the tools' GATE", T],
  ["S10", "C1 construction's part 4 is the outcome", CON, "const partFour = specific.state === \"PASS\" ? PASS : specific.state === \"FAIL\" ? FAIL : NOT_TESTED;", "const partFour = PASS;", "F36 · C1 · construction reaches", PC],
  ["S11", "C5 a tool reaches the right-to-exist gate", NC, "const existingPage = rightToExistGate({", "const existingPage = existingPageGate({", "C5 ·", T],
  ["S12", "C6 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C6 ·", T],
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
  `F36 sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${[...new Set(SABOTAGES.map((s) => s[6] ?? T))].join(", ")} · bound: one span per sabotage, applied ALONE; each run killed after 300 s`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, , n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, , n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
let proved = 0;
for (const [id, limb, file, from, to, expect, testFile = T] of SABOTAGES) {
  const orig = originals.get(file);
  const text = orig.toString("utf8");
  if (occurrences(text, from) !== 1) { lines.push(`${id} ${limb} ${file}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); continue; }
  const at = text.indexOf(from);
  writeFileSync(join(REPO, file), text.slice(0, at) + to + text.slice(at + from.length), "utf8");
  const landed = sha(read(file)) !== sha(orig);
  let failing = [];
  try {
    const r = spawnSync(process.execPath, ["--test", testFile], { cwd: REPO, encoding: "utf8", timeout: 300000 });
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
writeFileSync(join(REPO, "runs", "audit", "f36-sabotage-2026-09-29.txt"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
