/**
 * 🔴 F48 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs 8d03429 + Amendment 1 d09dd5e EVIDENCE; RR-92).
 *
 *   node test/helpers/f48-sabotage.mjs      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST (RR-85 §7): every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed
 * before any sabotage runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE,
 * proves it LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail
 * is hashed before and after. Evidence: runs/audit/f48-sabotage-2026-09-29.txt.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SD = "src/page/structured-data.mjs", BIN = "bin/page-structured-data.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = "test/f48-structured-data.test.mjs";
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C1 an unparseable block is recorded, never skipped", SD, `blocks.push({ valid: false, reason: "DOES_NOT_PARSE", types: [], texts: [] });`, "/* skipped */", "C1 ·"],
  ["S2", "C1 a block must name a type", SD, "valid: types.length > 0,", "valid: true,", "C1 ·"],
  ["S3", "C2 a text must be in the visible text", SD, `return n !== "" && !visible.includes(n);`, "return false;", "C2 ·"],
  ["S4", "C2 a text only in a script is RENDER-ONLY", SD, "const renderOnly = notShown.filter((t) => scripted.includes(normalise(t.text)));", "const renderOnly = [];", "C2 ·"],
  ["S5", "C2 the JSON-LD itself is not a render source", SD, `.filter((m) => !LD.test(m[0].slice(0, m[0].indexOf(">") + 1)))`, "", "C2 ·"],
  ["S6", "C2 ALIGNED needs no render-only text", SD, " && renderOnly.length === 0;", ";", "C2 ·"],
  ["S7", "C2 a NOT VISIBLE text misaligns", SD, "const misaligned = hidden.length > 0 || invalid.length > 0;", "const misaligned = invalid.length > 0;", "C2 ·"],
  ["S8", "C3 markup guarantees nothing, and says so", SD, `export const NO_GUARANTEE = "Structured data guarantees no rich-result display, ranking, indexing or AI citation; outcomes are measured only after publication (V3 §16).";`, `export const NO_GUARANTEE = "Structured data earns rich results.";`, "C3 ·"],
  ["S9", "C4 ALIGN only for a NOT VISIBLE text", SD, `...(hidden.length ? [Object.freeze({ kind: "ALIGN", count: hidden.length,`, `...(notShown.length ? [Object.freeze({ kind: "ALIGN", count: notShown.length,`, "C4 ·"],
  ["S10", "C4 REPAIR for an invalid block", SD, `...(invalid.length ? [Object.freeze({ kind: "REPAIR"`, `...(false ? [Object.freeze({ kind: "REPAIR"`, "C4 ·"],
  ["S11", "C5 a schema fact only from an ALIGNED page", SD, "schemaFact: aligned && ref ?", "schemaFact: ref ?", "C5 ·"],
  ["S12", "C6 NOT_MEASURED names the rendered text", SD, "missing: Object.freeze(!aligned && !misaligned ? [MISSING.RENDERED] : []),", "missing: Object.freeze([]),", "C2 ·"],
  ["S13", "C6 an unverified body measures nothing", SD, `if (!verified || typeof html !== "string"`, `if (typeof html !== "string"`, "C6 ·"],
  ["S14", "C4 a page without markup is NOT_MEASURED", SD, "if (blocks.length === 0) return", "if (false) return", "C4 ·"],
  ["S15", "C7 the entry point prints its bound", BIN, "console.log(`  bound            ${r.bound}`);", "console.log(\"  bound\");", "C7 · THE ENTRY POINT"],
  ["S16", "C7 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C7 · the assessment"],
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
  `F48 sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "f48-sabotage-2026-09-29.txt"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
