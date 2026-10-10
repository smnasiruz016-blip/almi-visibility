/**
 * 🔴 F73 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs 366476c EVIDENCE; RR-97 §5 — the "test that cannot fail" check as a STEP).
 *
 *   node test/helpers/f73-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST (RR-85 §7): every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed
 * before any sabotage runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE,
 * proves it LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail
 * is hashed before and after. Evidence: runs/audit/f73-sabotage-2026-09-30.txt.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const EX = "src/report/recommendation-explain.mjs", RD = "src/report/recommendation-explain-reader.mjs", BIN = "bin/recommendation-explain.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = ["test/f73-recommendation-explain.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C1 only draft_recommendation records are recommendations", RD, `recs.filter((r) => r.record_type === "draft_recommendation")`, `recs.filter((r) => r.record_type !== "recommendation_evidence")`, "C1 ·"],
  ["S2", "C2 an absent field is NOT MEASURED, never filled (the recorded-or-not rule)", EX, `return { state: "NOT_MEASURED", missing: MISSING[key] };`, `return { state: "RECORDED", from: "estimate", value: "LOW" };`, "C2 ·"],
  ["S3", "C2 an absent cost is never defaulted", EX, `expectedCost: recorded(d, "expectedCost", "cost"),`, `expectedCost: { state: "RECORDED", from: "default", value: 0 },`, "C2 ·"],
  ["S4", "C2 an absent reversibility is never inferred", EX, `reversibility: recorded(d, "reversibility", "reversible"),`, `reversibility: { state: "RECORDED", from: "inferred", value: "reversible" },`, "C2 ·"],
  ["S5", "C2 evidence is never assumed without a recorded link", EX, `: { state: "NOT_MEASURED", missing: MISSING.evidence },`, `: { state: "RECORDED", from: "assumed" },`, "C2 ·"],
  ["S6", "C2 a reason taken from a finding is labelled as such", EX, `{ state: "RECORDED", from: "the recorded finding it rests on" }`, `{ state: "RECORDED", from: "reason" }`, "C2 ·"],
  ["S7", "C3 a dangling reference is BROKEN", EX, "const broken = refs.filter((r) => !recordIds.has(r.id));", "const broken = [];", "C3 ·"],
  ["S8", "C3 a broken reference DISPROVES", EX, "const verdict = broken.length ? EXPLAIN.DISPROVED : notMeasured.length ? EXPLAIN.COULD_NOT_PROVE : EXPLAIN.PROVED;", "const verdict = notMeasured.length ? EXPLAIN.COULD_NOT_PROVE : EXPLAIN.PROVED;", "C3 ·"],
  ["S9", "C5 an explanation with a field missing is never PROVED", EX, "const verdict = broken.length ? EXPLAIN.DISPROVED : notMeasured.length ? EXPLAIN.COULD_NOT_PROVE : EXPLAIN.PROVED;", "const verdict = broken.length ? EXPLAIN.DISPROVED : EXPLAIN.PROVED;", "C5 · REAL"],
  ["S10", "C4 approval is reported as recorded, never implied", EX, `approvedBy: has(d.approved_by) ? "RECORDED" : "NONE RECORDED"`, `approvedBy: "RECORDED"`, "C4 ·"],
  ["S11", "C3 references are resolved against every recorded store", RD, `"audit/crawler-classification.jsonl", `, "", "C5 · REAL"],
  ["S12", "C5 the entry point prints its bound", BIN, "console.log(`  bound            ${r.bound}`);", "console.log(\"  bound\");", "C5 · THE ENTRY POINT"],
  ["S13", "C5 the entry point prints every field", BIN, "for (const [k, v] of Object.entries(e.perField)) console.log(", "for (const [k, v] of Object.entries(e.perField).slice(0, 2)) console.log(", "C5 · THE ENTRY POINT"],
  ["S14", "C5 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C5 · the explainer"],
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
  `F73 sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "f73-sabotage-2026-09-30.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
