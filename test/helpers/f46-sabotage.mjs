/**
 * 🔴 F46 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs 2e76216 EVIDENCE; RR-96 §4).
 *
 *   node test/helpers/f46-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST (RR-85 §7): every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed
 * before any sabotage runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE,
 * proves it LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail
 * is hashed before and after. Evidence: runs/audit/f46-sabotage-2026-09-30.txt.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CA = "src/facts/citation-audit.mjs", BIN = "bin/citation-audit.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = ["test/f46-citation-audit.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C1 a fetch that failed is not a dead link; an unrecognised outcome fails closed", CA, `return "NOT_MEASURED";\n}`, `return fail;\n}`, "C1 ·"],
  ["S2", "C1 a recorded failure is FAILED / MISMATCHED", CA, `if (o === "fail" || o === "failed" || o === "mismatch") return fail;`, "", "C1 ·"],
  ["S3", "C2 PROVED requires FIT CONFIRMED", CA, ` && checks.fit.result === "CONFIRMED";`, `;`, "C2 ·"],
  ["S4", "C2 any recorded failure DISPROVES", CA, "const verdict = results.some((r) => FAILURES.has(r)) ? CITATION.DISPROVED : proved ? CITATION.PROVED : CITATION.COULD_NOT_PROVE;", "const verdict = proved ? CITATION.PROVED : CITATION.COULD_NOT_PROVE;", "C2 ·"],
  ["S5", "C2 an unmeasured fingerprint never counts as matched", CA, `checks.fingerprint.result === "MATCHED" && checks.authority`, `checks.authority`, "C2 ·"],
  ["S6", "C3 only a declared person's verdict decides FIT", CA, `if (!v.checkedBy || !persons.includes(v.checkedBy)) return`, "if (false) return", "C3 ·"],
  ["S7", "C3 no verdict is NEEDS A PERSON, never a pass", CA, `if (!v?.verdict) return { result: "NEEDS_A_PERSON", reason: "no verdict is recorded", ...beside };`, `if (!v?.verdict) return { result: "CONFIRMED", ...beside };`, "C3 ·"],
  ["S8", "C3 a recorded CONFLICT or a missing element REFUTES", CA, `if (v.verdict === "CONFLICT" || (v.elementsNotFoundKeys ?? []).length > 0) return { result: "REFUTED", ...beside };`, "", "C3 ·"],
  ["S9", "C3 the roster of persons is passed, never defaulted", CA, "if (!Array.isArray(persons)) throw", "if (false) throw", "C3 ·"],
  ["S10", "C4 only admissible tiers are ADMISSIBLE", CA, `if (!ADMISSIBLE_TIERS.includes(tier)) return { result: "NOT_ADMISSIBLE", tier };`, "", "C4 ·"],
  ["S11", "C4 a verification date is required (V3 §10.3)", CA, `if (!day(f?.verification?.checkedOn)) return`, "if (false) return", "C4 ·"],
  ["S12", "C4 disagreeing named and numeric tiers are never resolved silently", CA, "if (named !== null && fromNumber !== null && fromNumber !== named) return", "if (false) return", "C4 ·"],
  ["S13", "C4 the numeric tier is read by the engine's one tier reader", CA, "if (num !== null) fromNumber = sourceTierOfFact({ source: { tier: num } });", `if (num !== null) fromNumber = String(num);`, "C4 ·"],
  ["S14", "C5 the entry point prints its bound", BIN, "console.log(`  bound            recorded registry only", "console.log(`  bound            ", "C5 · THE ENTRY POINT"],
  ["S15", "C5 the entry point names the fresh-fetch gate", BIN, "console.log(`  gate             a fresh re-check needs a bounded fetch under its own authorisation (bin/source-integrity.mjs) — not run`);", "", "C5 · THE ENTRY POINT"],
  ["S16", "C5 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C5 · the audit"],
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
  `F46 sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "f46-sabotage-2026-09-30.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
