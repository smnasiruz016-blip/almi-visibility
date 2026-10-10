/**
 * 🔴 F47 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs ccd4c1e EVIDENCE; RR-96 §4).
 *
 *   node test/helpers/f47-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST (RR-85 §7): every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed
 * before any sabotage runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE,
 * proves it LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail
 * is hashed before and after. Evidence: runs/audit/f47-sabotage-2026-09-30.txt.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const EM = "src/facts/entity-map.mjs", BIN = "bin/entity-map.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = ["test/f47-entity-map.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C1 questions come only from machine-readable data", EM, `.filter((t) => t.kind === "question").length`, `.length + (p.html.match(/\\?/g) ?? []).length`, "C1 ·"],
  ["S2", "C1 a retired fact never enters the map", EM, `const facts = records.filter((f) => f?.life?.status !== "retired");`, "const facts = records;", "C1 ·"],
  ["S3", "C2 every placement entry is enumerated, objects included", EM, `out.push({ ref: typeof r === "string" ? r : null, where: \`placement \${list}\`, list });`, `if (typeof r === "string") out.push({ ref: r, where: \`placement \${list}\`, list });`, "C2 ·"],
  ["S4", "C2 an awaiting entry is DECLARED AWAITING, never resolved or broken", EM, `if (r.list === AWAITING_LIST) return { ...r, state: "DECLARED_AWAITING" };`, "", "C2 ·"],
  ["S5", "C2 an unresolved reference is UNRESOLVED, never dropped", EM, `return { ...r, state: "UNRESOLVED" };`, `return { ...r, state: "RESOLVED" };`, "C2 ·"],
  ["S6", "C2 only a resolved reference is drawn as PLACED", EM, `placed: resolution.filter((r) => r.state === "RESOLVED").length`, "placed: resolution.length", "C2 ·"],
  ["S7", "C3 a fact id held twice is INCONSISTENT", EM, `...[...idCount].filter(([, n]) => n > 1).map(([id]) => ({ kind: "FACT_ID_HELD_TWICE", id })),`, "", "C3 ·"],
  ["S8", "C3 a source with two publishers is INCONSISTENT", EM, `...[...publishersBySource].filter(([, s]) => s.size > 1).map(([src]) => ({ kind: "SOURCE_WITH_TWO_PUBLISHERS", source: src })),`, "", "C3 ·"],
  ["S9", "C3 names differing only in form go to a person", EM, `const needsAPerson = [...byFold.values()].filter((g) => g.length > 1)`, `const needsAPerson = [...byFold.values()].filter((g) => g.length > 99)`, "C3 ·"],
  ["S10", "C4 a page without a body is NOT MEASURED", EM, `if (typeof p.html !== "string" || p.html === "") return { pageId: p.pageId, questions: null, missing: "a stored body" };`, `if (typeof p.html !== "string" || p.html === "") return { pageId: p.pageId, questions: 0, invalidBlocks: 0 };`, "C4 ·"],
  ["S11", "C5 PROVED only when nothing is open", EM, "const verdict = inconsistent.length ? MAP_VERDICT.DISPROVED : open ? MAP_VERDICT.COULD_NOT_PROVE : MAP_VERDICT.PROVED;", "const verdict = inconsistent.length ? MAP_VERDICT.DISPROVED : MAP_VERDICT.PROVED;", "C5 · FIRING CONTROL"],
  ["S12", "C5 any inconsistency DISPROVES", EM, "const verdict = inconsistent.length ? MAP_VERDICT.DISPROVED : open ? MAP_VERDICT.COULD_NOT_PROVE : MAP_VERDICT.PROVED;", "const verdict = open ? MAP_VERDICT.COULD_NOT_PROVE : MAP_VERDICT.PROVED;", "C3 ·"],
  ["S13", "C5 the entry point prints its bound", BIN, "console.log(`  bound            recorded registry, placement, page specs and stored page bodies only", "console.log(`  bound            ", "C5 · THE ENTRY POINT"],
  ["S14", "C5 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C5 · the map"],
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
  `F47 sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "f47-sabotage-2026-09-30.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
