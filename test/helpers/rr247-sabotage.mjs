/**
 * 🔴 RR-247 · THE DELIBERATE-INVOCATION GATE — ONE SABOTAGE PER PROTECTION (test/helpers/harness-gate.mjs, its population census, its
 * behaviour census, its refusal code, the how-to-run lines). Each must turn its NAMED test in test/rr247-harness-gate.test.mjs red.
 *
 *   node test/helpers/rr247-sabotage.mjs --deliberate [--practice] [--only=<id>]      NOT part of `npm test`
 *
 * The discipline of test/helpers/rr246-sabotage.mjs: PRE-FLIGHT FIRST (every span exactly once in the code live now, else NOT PROVED,
 * never skipped); each limb replaces its span ALONE, proves it LANDED, runs the test file, and requires its NAMED test to fail by an
 * AssertionError; the file is restored by raw bytes (sha256 checked); the test file is GREEN again at the end; the production trail is
 * hashed before and after. While G01/G02 hold the gate open, every harness that test file starts runs under the bare-run census preload
 * (writes, child processes and network refused), and the bare `node --test` of HG-4 runs only in a disposable copy.
 * Evidence: runs/audit/rr247-sabotage-[practice-]<date>T<hhmm>.txt, written once (wx).
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = "test/rr247-harness-gate.test.mjs";
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr247-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const GATE = "test/helpers/harness-gate.mjs", F01 = "test/helpers/f01-sabotage.mjs", F19 = "test/helpers/f19-census-controls.mjs";
const GATE_IMPORT = 'import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)\n';

/* [id, limb, file, from, to, test file, named test prefix] */
const SABOTAGES = [
  ["G01", "the gate stops a harness that a bare run starts", GATE, "if (!ranAlone && !process.argv.includes(DELIBERATE_FLAG)) {", "if (false) {", T, "HG-4 ·"],
  ["G02", "a refusal is never a success (exit 2)", GATE, "  process.exit(2);\n", "  process.exit(0);\n", T, "HG-3 ·"],
  ["G03", "every sabotage harness imports the gate first", F01, GATE_IMPORT, "", T, "HG-1 ·"],
  ["G04", "a writer that a bare run discovers is gated (found by behaviour)", F19, GATE_IMPORT, "", T, "HG-2 ·"],
  /* G05's "to" is assembled, so this harness itself never carries a how-to-run line without the flag (HG-5 reads it too) */
  ["G05", "every how-to-run line says --deliberate", F19, `${F19} --deliberate `, `${F19} `, T, "HG-5 ·"],
];
const RUN = ONLY ? SABOTAGES.filter((s) => s[0] === ONLY) : SABOTAGES;
if (ONLY && RUN.length !== 1) { console.error(`REFUSED — no sabotage ${ONLY}`); process.exit(2); }
if (existsSync(EVIDENCE)) { console.error(`REFUSED — ${EVIDENCE} exists; an earlier run's evidence is never overwritten`); process.exit(2); }

const FILES = [...new Set(RUN.map((s) => s[2]))];
const originals = new Map(FILES.map((p) => [p, read(p)]));
const restore = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restore);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restore(); process.exit(130); });

const inEol = (text, s) => (text.includes("\r\n") ? s.replace(/\n/g, "\r\n") : s);
const occurrences = (text, s) => (s ? text.split(inEol(text, s)).length - 1 : 0);
const textOf = (p) => originals.get(p).toString("utf8");
const preflight = RUN.map((s) => [s[0], occurrences(textOf(s[2]), s[3])]);
const trailBefore = sha(read(TRAIL));
const run = (file) => spawnSync(process.execPath, ["--test", file], { cwd: REPO, encoding: "utf8", timeout: 3600000 });
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function failureClassOf(out, prefix) {
  const ls = out.split(/\r?\n/);
  const start = ls.findIndex((x) => /✖ failing tests:/.test(x));
  const at = ls.findIndex((l, i) => i > start && new RegExp(`^✖ ${esc(prefix)}`).test(l));
  const detail = at < 0 ? null : ls.slice(at + 1).find((l) => l.trim() !== "");
  return detail ? detail.trim().split(/[ :[]/)[0] : null;
}
const base = run(T);
const baseOut = `${base.stdout}${base.stderr}`;
const baseGreen = base.status === 0 && RUN.every((s) => new RegExp(`✔ ${esc(s[6])}`).test(baseOut)) && !/ℹ skipped [1-9]/.test(baseOut);
const lines = [
  `RR-247 deliberate-invocation gate sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
  `population: ${RUN.length} sabotage(s) — one per protection (the gate's stop, its exit code, the harness census, the behaviour census, the how-to-run lines)`,
  `BASELINE: ${baseGreen ? "GREEN (every named test passed, none skipped)" : "NOT GREEN — no sabotage is run"}`,
  `PRE-FLIGHT (span occurrences in the code now): ${preflight.map(([id, n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, file, from, to, testFile, named] of baseGreen ? RUN : []) {
  const text0 = textOf(file), original = originals.get(file);
  if (occurrences(text0, from) !== 1 || to === from) { lines.push(`${id} ${limb}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); console.log(lines.at(-1)); continue; }
  const ff = inEol(text0, from), at = text0.indexOf(ff);
  writeFileSync(join(REPO, file), text0.slice(0, at) + inEol(text0, to) + text0.slice(at + ff.length), "utf8");
  const landed = sha(read(file)) !== sha(original);
  let out = "", failing = [];
  try { const r = run(testFile); out = `${r.stdout}${r.stderr}`; failing = [...out.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]); }
  finally { writeFileSync(join(REPO, file), original); }
  const restored = sha(read(file)) === sha(original);
  const red = failing.some((n) => n.startsWith(named));
  const cls = failureClassOf(out, named);
  const ok = landed && red && cls === "AssertionError" && restored;
  if (ok) proved += 1;
  lines.push(`${id} ${limb} · ${file}: landed ${landed} · "${named}" red ${red} · its failure ${cls ?? "none"} · restored ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`);
  console.log(lines.at(-1));
}
const greenAgain = run(T).status === 0;
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `GREEN after restore: ${greenAgain}`, `proved ${proved} of ${RUN.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(dirname(EVIDENCE), { recursive: true });
writeFileSync(EVIDENCE, lines.join("\n") + "\n", { flag: "wx" });
console.log(lines.slice(-2).join("\n"));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === RUN.length && greenAgain ? 0 : 1;
