/**
 * 🔴 RR-246 · F07 ACCEPTANCE AMENDMENT 4 — ONE SABOTAGE PER PROTECTION THIS ROUND ADDED (the known-read correction, the retirement that
 * keeps the sets sealed, required and scanned). The read guard's own limbs are test/helpers/rr80-sabotage.mjs (re-run with every F07
 * harness); its installation is proved by test/rr246-f07-amendment4.test.mjs GD-1 and the new-session record.
 *
 *   node test/helpers/rr246-sabotage.mjs [--practice] [--only=<id>]      NOT part of `npm test`
 *
 * The discipline of test/helpers/rr244-sabotage.mjs: PRE-FLIGHT FIRST (every span exactly once in the code live now, else NOT PROVED,
 * never skipped); each limb replaces its span ALONE, proves it LANDED, runs its named test file, and requires its NAMED test to fail by
 * an AssertionError; the file is restored by raw bytes (sha256 checked); every test file is GREEN again at the end; the production trail
 * is hashed before and after. Evidence: runs/audit/rr246-sabotage-[practice-]<date>T<hhmm>.txt, written once (wx).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = "test/rr246-f07-amendment4.test.mjs", TL = "test/f07-amendment-leak-census.test.mjs";
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr246-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const KR = "src/audit-trail/known-reads.mjs", REG = "config/evidence-roles.mjs", ROOTS = "src/governance/sealed-store-roots.mjs";
const FW = "tools/heldout-firewall.mjs", FWB = "bin/heldout-firewall.mjs", LIFE = "src/heldout/lifecycle.mjs";

/* [id, limb, file, from, to, test file, named test prefix] */
const SABOTAGES = [
  ["B01", "a correction that claims an ACCESS record is refused", KR, 'if (!/^NO\\b/.test(String(c?.accessRecorded ?? ""))) out.push(', "if (false) out.push(", T, "KR-2 ·"],
  ["B02", "a correction that claims a repair is refused", KR, 'if (c?.treatment !== "REPRESENTED_NOT_REPAIRED") out.push(', "if (false) out.push(", T, "KR-2 ·"],
  ["B03", "a correction that miscounts its reads is refused", KR, "if (!(Number.isInteger(c?.knownReads) && c.knownReads > 0 && c.knownReads === reads.length)) out.push(", "if (false) out.push(", T, "KR-2 ·"],
  ["B04", "a read that names a path is refused", KR, "if (!READ_SHAPE.test(String(r)) || !String(r).startsWith(`${i + 1} `)) out.push(", "if (false) out.push(", T, "KR-2 ·"],
  ["B05", "a correction is recorded once, ever", KR, "corrections.filter((c) => !events.some(", "corrections.filter((c) => true || !events.some(", T, "KR-3 ·"],
  ["B06", "the C3 selection is retired", REG, '    role: "RETIRED_CONTAMINATED",\n    scope: "F10 C3:', '    role: "HELD_OUT_EVIDENCE",\n    scope: "F10 C3:', T, "RT-1 ·"],
  ["B07", "the lifecycle refuses a retired set as retired", LIFE, '  if (e.role === "RETIRED_CONTAMINATED") return { refuse: "SET_RETIRED_CONTAMINATED" };\n', "", T, "RT-1 ·"],
  ["B08", "a sealed retired set still requires its store (fails closed unlocated)", ROOTS, 'SEALED_ROLES_IN_STORES.includes(e?.role) || (e?.role === "RETIRED_CONTAMINATED" && e?.sealed === true);', "SEALED_ROLES_IN_STORES.includes(e?.role);", T, "RT-2 ·"],
  ["B09", "a sealed retired set is still read and scanned inside the boundary", FW, "export const scannedInBoundary = (e) => NEW_SEALED_ROLES.includes(e?.role) || isSealedRetiredInBoundary(e);", "export const scannedInBoundary = (e) => NEW_SEALED_ROLES.includes(e?.role);", T, "RT-3 ·"],
  ["B10", "the firewall entry point re-derives only DERIVED retired populations", FWB, 'for (const entry of ofRole("RETIRED_CONTAMINATED").filter((e) => e.resource?.derivation)) {', 'for (const entry of ofRole("RETIRED_CONTAMINATED")) {', TL, "F07A · REAL · the production entry point enumerates every sealed role"],
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
const TESTS = [...new Set(RUN.map((s) => s[5]))];
const run = (file) => spawnSync(process.execPath, ["--test", file], { cwd: REPO, encoding: "utf8", timeout: 1800000 });
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function failureClassOf(out, prefix) {
  const ls = out.split(/\r?\n/);
  const start = ls.findIndex((x) => /✖ failing tests:/.test(x));
  const at = ls.findIndex((l, i) => i > start && new RegExp(`^✖ ${esc(prefix)}`).test(l));
  const detail = at < 0 ? null : ls.slice(at + 1).find((l) => l.trim() !== "");
  return detail ? detail.trim().split(/[ :[]/)[0] : null;
}
const baseOut = Object.fromEntries(TESTS.map((f) => { const r = run(f); return [f, { ok: r.status === 0, out: `${r.stdout}${r.stderr}` }]; }));
const baseGreen = TESTS.every((f) => baseOut[f].ok) && RUN.every((s) => new RegExp(`✔ ${esc(s[6])}`).test(baseOut[s[5]].out)) && TESTS.every((f) => !/ℹ skipped [1-9]/.test(baseOut[f].out));
const lines = [
  `RR-246 F07 Amendment 4 sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
  `population: ${RUN.length} sabotage(s) — one per protection this round added (the known-read correction; the retirement that keeps the sets sealed, required and scanned)`,
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
  lines.push(`${id} ${limb} · ${file}: landed ${landed} · "${named.slice(0, 40)}" red ${red} · its failure ${cls ?? "none"} · restored ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`);
  console.log(lines.at(-1));
}
const greenAgain = TESTS.every((f) => run(f).status === 0);
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `GREEN after restore: ${greenAgain}`, `proved ${proved} of ${RUN.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(dirname(EVIDENCE), { recursive: true });
writeFileSync(EVIDENCE, lines.join("\n") + "\n", { flag: "wx" });
console.log(lines.slice(-2).join("\n"));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === RUN.length && greenAgain ? 0 : 1;
