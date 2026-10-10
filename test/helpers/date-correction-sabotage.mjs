/**
 * 🔴 RR-153 TIMING CORRECTION · F05 DECLARED DATE CORRECTION · ONE SABOTAGE PER GUARD (src/authority/date-correction.mjs).
 *
 *   node test/helpers/date-correction-sabotage.mjs --deliberate      NOT part of `npm test`
 *
 * BASELINE green first; PRE-FLIGHT every span exactly once; each sabotage alone; the named test must fail by an ASSERTION; restored by
 * raw-byte sha256; the production trail hashed before and after.
 * Evidence: runs/audit/date-correction-sabotage-rr153-2026-10-03.txt — its own file; it refuses to overwrite one that exists.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const EVIDENCE = join(REPO, "runs", "audit", process.env.DC_EVIDENCE_NAME ?? "date-correction-sabotage-rr153-2026-10-03.txt");
if (existsSync(EVIDENCE)) { console.error(`refused: ${EVIDENCE} exists — an earlier run's evidence is never overwritten; name a new file with DC_EVIDENCE_NAME`); process.exit(2); }
const DC = "src/authority/date-correction.mjs";
const T = ["test/date-correction.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const D1 = "D1 ·", D2 = "D2 ·", D3 = "D3 ·";

const SABOTAGES = [
  ["Z1", "only an OWNER-issued record corrects a date", DC, "    if (declarer.issuer?.class !== \"OWNER\") throw", "    if (false) throw", D3],
  ["Z2", "a correction never moves a record into its own future", DC, "    if (d.effectiveFrom > declarer.issuedAt) throw", "    if (false) throw", D3],
  ["Z3", "one target is corrected once", DC, "    if (corrected.has(d.target)) throw", "    if (false) throw", D3],
  ["Z4", "an unknown target is refused, never invented", DC, "    if (!target) throw", "    if (false) throw", D3],
  ["Z5", "the corrected record names the correction and the date its file name carried", DC, "issuedAtSource: `DATE_CORRECTION — named ${target.issuedAt}, corrected by ${d.declarer}`", "issuedAtSource: \"DATE_CORRECTION\"", D2],
  ["Z6", "a block without its reason (or target, or ISO date) is refused", DC, "if (!block.target || !ISO.test(block.effectiveFrom ?? \"\") || !block.reason)", "if (!block.target)", D1],
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
  `RR-153 date-correction sabotage run · ${new Date().toISOString()}`,
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
