/**
 * 🔴 F82 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs 25c7f49 EVIDENCE; RR-92 §3.4).
 *
 *   node test/helpers/f82-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST (RR-85 §7): every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed
 * before any sabotage runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE,
 * proves it LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail
 * is hashed before and after. Evidence: runs/audit/f82-sabotage-2026-09-29.txt.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const IX = "src/page/indexation.mjs", EV = "src/page/indexation-evidence.mjs", BIN = "bin/page-indexation.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = "test/f82-indexation.test.mjs";
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C2 indexed needs at least one impression", IX, "Number(observation.impressions) >= 1", "Number(observation.impressions) >= 0", "C2 ·"],
  ["S2", "C3 an observed state is dated", IX, " && iso(observation.windowStart) && iso(observation.windowEnd)", "", "C3 ·"],
  ["S3", "C1 the most recent dated observation decides", IX, "(!seen || Date.parse(notIndexed.on) > Date.parse(seen.windowEnd))", "(!seen)", "C1 ·"],
  ["S4", "C1 an inspection is recorded evidence (has a ref)", IX, ` && typeof inspection.ref === "string" && inspection.ref !== ""`, "", "C1 ·"],
  ["S5", "C2 absence is UNKNOWN, never not-indexed", IX, "let state = INDEX_STATE.UNKNOWN;", "let state = INDEX_STATE.OBSERVED_NOT_INDEXED;", "C2 ·"],
  ["S6", "C2 UNKNOWN names its missing fact", IX, "missing: Object.freeze(state === INDEX_STATE.UNKNOWN ? [MISSING.OBSERVATION] : []),", "missing: Object.freeze([]),", "C2 ·"],
  ["S7", "C2 INDEXABLE ≠ INDEXED is printed", IX, `export const NOTICE = "INDEXABLE ≠ INDEXED";`, `export const NOTICE = "INDEXED";`, "C2 ·"],
  ["S8", "C2 indexability travels beside, never as, the state", IX, "    indexability,\n    notice: NOTICE,", "    indexability: \"INDEXED\",\n    notice: NOTICE,", "C2 ·"],
  ["S9", "C4 an unrecorded query count is never zero", EV, "queries: queries.get(pageId) ?? null,", "queries: queries.get(pageId) ?? 0,", "REAL ·"],
  ["S10", "C4 owned is labelled owned", IX, `export const SOURCE_CLASS = "OWNED_SEARCH_CONSOLE";`, `export const SOURCE_CLASS = "PUBLIC_RESEARCH";`, "C4 ·"],
  ["S11", "C5 CLEAR only for an observed-indexed page", IX, "s.state === INDEX_STATE.OBSERVED_INDEXED ? [Object.freeze({ pageId: s.pageId, state: \"CLEAR\"", "s.state !== INDEX_STATE.OBSERVED_NOT_INDEXED ? [Object.freeze({ pageId: s.pageId, state: \"CLEAR\"", "C5 ·"],
  ["S12", "C5 a recorded not-indexed page is BLOCKED", IX, ": s.state === INDEX_STATE.OBSERVED_NOT_INDEXED ? [Object.freeze({ pageId: s.pageId, state: \"BLOCKED\"", ": false ? [Object.freeze({ pageId: s.pageId, state: \"BLOCKED\"", "C5 ·"],
  ["S13", "C6 inspections are passed, never defaulted", EV, "if (!Array.isArray(inspections)) throw", "if (false) throw", "C6 · THE ENTRY POINT"],
  ["S14", "C6 the entry point prints its bound", BIN, "console.log(`  bound            ${r.bound}`);", "console.log(\"  bound\");", "C6 · THE ENTRY POINT"],
  ["S15", "C6 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C6 · the state"],
  ["S16", "C5 the real reader supplies the checks", EV, "indexingChecks: indexingChecks(states),", "indexingChecks: [],", "REAL ·"],
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
  `F82 sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "f82-sabotage-2026-09-29.txt"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
