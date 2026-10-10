/**
 * 🔴 F32 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs a0b9776 EVIDENCE; RR-87).
 *
 *   node test/helpers/f32-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST (RR-85 §7): every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed
 * before any sabotage runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE,
 * proves it LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail
 * is hashed before and after. Evidence: runs/audit/f32-sabotage-2026-09-29.txt.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const D = "src/page/duplication.mjs", EV = "src/page/duplication-evidence.mjs", SH = "src/audit/shell.mjs", CC = "src/audit/content-checks.mjs";
const POP = "src/page/existing-page-population.mjs", BIN = "bin/page-duplication.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = "test/f32-duplication.test.mjs";
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C1 grouping is by the main text's hash", D, "const h = sha(m.main);", "const h = sha(m.pageId);", "C1 ·"],
  ["S2", "C1 the stated normalisation (case, punctuation)", D, `const main = body.confident ? words(body.bodyText).join(" ") : null;`, "const main = body.confident ? body.bodyText : null;", "C1 ·"],
  ["S3", "C1 a group needs two pages", D, ".filter((g) => g.length > 1)", ".filter((g) => g.length > 0)", "C1 ·"],
  ["S4", "C2 ABOVE 40 percent, not at it", D, "overlap > OVERLAP_REVIEW_TRIGGER ?", "overlap >= OVERLAP_REVIEW_TRIGGER ?", "C2 ·"],
  ["S5", "C2 the trigger is V3's 40 percent", D, "export const OVERLAP_REVIEW_TRIGGER = 0.4;", "export const OVERLAP_REVIEW_TRIGGER = 0.9;", "C2 ·"],
  ["S6", "C2/C3 a percentage never becomes a semantic verdict", D, `if (!review) return { state: "NOT_JUDGED", missing: MISSING.REVIEW };`, `if (!review) return overlapAbove ? { state: "DUPLICATE" } : { state: "DISTINCT" };`, "C2 ·"],
  ["S7", "C3 a review must compare every aspect", D, "if (!SEMANTIC_ASPECTS.every((a) => review.compared?.includes(a)))", "if (false)", "C3 ·"],
  ["S8", "C3 high overlap passes only with documented distinct value", D, "if (overlapAbove && !review.documentedDistinctValue)", "if (false)", "C3 ·"],
  ["S9", "C3 a page with a reviewed duplicate is DUPLICATE", D, `mine.some((p) => p.semantic.state === "DUPLICATE") ? "DUPLICATE"`, `false ? "DUPLICATE"`, "C3 ·"],
  ["S10", "C4 shared means seen on ANOTHER page", D, ".filter((s) => seenOn.get(s) > 1)", ".filter((s) => seenOn.get(s) > 0)", "C4 ·"],
  ["S11", "C4 no invented dominance threshold", D, `shellShare === 1 ? "SHELL_ONLY"`, `shellShare >= 0.75 ? "SHELL_ONLY"`, "C4 ·"],
  ["S12", "C4 chrome is measured, not assumed", SH, "export const visibleText = (html) => textOf(removeElements(String(html ?? \"\"), STRIP_ELEMENTS));", "export const visibleText = (html) => textOf(removeElements(String(html ?? \"\"), [...STRIP_ELEMENTS, ...CHROME_ELEMENTS]));", "C4 ·"],
  ["S13", "C5 unique value is never a word count", D, `: { state: "NOT_JUDGED", missing: MISSING.VALUE };`, `: m.main !== null && m.main.split(" ").length < 350 ? { state: "INSUFFICIENT", basis: "WORD_COUNT" } : { state: "NOT_JUDGED", missing: MISSING.VALUE };`, "C5 ·"],
  ["S14", "C5 SHELL ONLY is insufficient", D, `: shell === "SHELL_ONLY" ? { state: "INSUFFICIENT", basis: "SHELL_ONLY" }`, `: false ? { state: "INSUFFICIENT", basis: "SHELL_ONLY" }`, "C5 ·"],
  ["S15", "C5 a recorded value record decides", D, `: rec && typeof rec.insufficient === "boolean" ?`, `: false && rec ?`, "C5 ·"],
  ["S16", "C5 an empty review list is passed, never defaulted", D, "if (!Array.isArray(reviews) || !Array.isArray(valueRecords)) throw", "if (false) throw", "C5 ·"],
  ["S17", "C6 no action field in the result", D, "    methods: METHODS,\n", "    methods: METHODS, action: \"REJECT\",\n", "C6 ·"],
  ["S18", "C6 the legacy thresholds are unchanged", CC, "export const NEAR_DUPLICATE_THRESHOLD = 0.9;", "export const NEAR_DUPLICATE_THRESHOLD = 0.4;", "C6 ·"],
  ["S19", "C7 an unverified body is not measured", D, "if (!p.verified || typeof p.html !== \"string\" || p.html === \"\")", "if (typeof p.html !== \"string\" || p.html === \"\")", "C7 · an unverified"],
  ["S20", "C7 verification is the body's OWN fingerprint", EV, "f.observationId === p.bodyObservationId && f.verified === true", "f.verified === true", "C7 · an unverified"],
  ["S21", "C7 the population names the body's observation", POP, "bodyObservationId: latest ? latest.observation_id : null", "bodyObservationId: null", "REAL ·"],
  ["S22", "C7 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C7 · the detection"],
  ["S23", "C7 the entry point prints its bound", BIN, "console.log(`  bound            ${r.bound}`);", "console.log(\"  bound\");", "C7 · THE ENTRY POINT"],
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
  `F32 sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "f32-sabotage-2026-09-29.txt"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
