/**
 * 🔴 RR-244 · F78 ACCEPTANCE AMENDMENT 2 — ONE SABOTAGE PER LIMB OF THE AMENDMENT 2 TEXT, AND PER REPAIR THIS ROUND MADE.
 *
 *   node test/helpers/rr244-sabotage.mjs --deliberate [--practice] [--only=<id>]      NOT part of `npm test`
 *
 * The same discipline as test/helpers/rr243-sabotage.mjs: PRE-FLIGHT FIRST (every span exactly once in the code live now, or the limb is
 * NOT PROVED, never skipped); each limb replaces its span ALONE, proves it LANDED, runs test/rr244-f78-amendment2.test.mjs, and requires
 * its NAMED test to fail by an AssertionError; the file is restored by raw bytes (sha256 checked); the whole file must be GREEN again at
 * the end; the production trail is hashed before and after. The 35 RR-243 limbs are run by their own harness.
 * --practice writes runs/audit/rr244-sabotage-practice-<date>T<hhmm>.txt; the real run writes runs/audit/rr244-sabotage-<date>T<hhmm>.txt.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = "test/rr244-f78-amendment2.test.mjs";
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr244-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const RA = "bin/render-audit.mjs", MA = "bin/mobile-audit.mjs", RC = "src/cost/run-cost.mjs", SE = "src/governance/scoped-entry.mjs";
const CQ = "bin/collect-public-questions.mjs", RCO = "bin/render-collect.mjs", QM = "bin/quote-match.mjs";
const BC = "subjects/almi-oet/tools/build-corpus.mjs", NC = "subjects/almi-oet/tools/nursing-chain.mjs";
const LATE_RA = "const RUN_COST = LIVE ? runCost({ entryPoint: \"bin/render-audit.mjs\"";
const LATE_MA = "const RUN_COST = LIVE ? runCost({ entryPoint: \"bin/mobile-audit.mjs\"";

/* [id, limb, file, from, to, named test prefix] */
const SABOTAGES = [
  ["A01", "render-audit: a scope-gate refusal in its connector mode is recorded (the durable gate)", RA, "entry: \"bin/render-audit.mjs\", governed: LIVE,", "entry: \"bin/render-audit.mjs\", governed: false,", "A2-2 ·"],
  ["A02", "mobile-audit: a scope-gate refusal in its connector mode is recorded (the durable gate)", MA, "entry: \"bin/mobile-audit.mjs\", governed: LIVE,", "entry: \"bin/mobile-audit.mjs\", governed: false,", "A2-2 ·"],
  ["A03", "render-audit: a connector-mode run without --confirm has its refusal recorded (it ends only after the recorder)", RA, LATE_RA, "if (LIVE && !process.argv.includes(\"--confirm\")) process.exit(3);\n" + LATE_RA, "A2-3 ·"],
  ["A04", "mobile-audit: a connector-mode run without --confirm has its refusal recorded (it ends only after the recorder)", MA, LATE_MA, "if (LIVE && !process.argv.includes(\"--confirm\")) process.exit(3);\n" + LATE_MA, "A2-3 ·"],
  ["A05", "render-audit offline writes nothing to the trail", RA, "entry: \"bin/render-audit.mjs\", governed: LIVE,", "entry: \"bin/render-audit.mjs\", governed: true,", "A2-4 ·"],
  ["A06", "mobile-audit offline writes nothing to the trail", MA, "entry: \"bin/mobile-audit.mjs\", governed: LIVE,", "entry: \"bin/mobile-audit.mjs\", governed: true,", "A2-4 ·"],
  ["A07", "render-audit offline makes no request", RA, "const CORPUS = confineToRepo(", "if (!LIVE) globalThis.fetch(\"https://fixture-world.invalid/offline\").catch(() => {});\nconst CORPUS = confineToRepo(", "A2-4 ·"],
  ["A08", "a run refused at its scope gate makes no request", SE, "  if (!run.allowed) process.exit(SCOPE_REFUSED_EXIT);", "  if (!run.allowed) { globalThis.fetch(\"https://fixture-world.invalid/gate\").catch(() => {}); process.exit(SCOPE_REFUSED_EXIT); }", "A2-2 ·"],
  ["A09", "a connector-mode run without --confirm makes no request", RC, "if (!permission?.mayWrite) {", "if (false) {", "A2-3 ·"],
  ["A10", "a confirmed run ending in a refusal by the target writes its one cost entry", RC, "if (written || coveredBy) return null;", "if (written || coveredBy || code === 3) return null;", "A2-5 ·"],
  ["A11", "build-corpus: the REPO repair (a confirmed run completes and writes its cost entry)", BC, "repo: ENGINE_ROOT, permission, target: join(OUT, \"corpus-manifest.json\")", "repo: REPO, permission, target: join(OUT, \"corpus-manifest.json\")", "A2-6 ·"],
  ["A12", "nursing-chain: the REPO repair", NC, "repo: ENGINE_ROOT, permission, target: cached,", "repo: REPO, permission, target: cached,", "A2-6b ·"],
  ["A13", "collect-public-questions: its no --confirm refusal comes after the recorder", CQ, "const SCOPE = scopedEntryPoint({ entry: \"bin/collect-public-questions.mjs\"", "if (!permission.mayWrite) process.exit(2);\nconst SCOPE = scopedEntryPoint({ entry: \"bin/collect-public-questions.mjs\"", "A2-3 ·"],
  ["A14", "render-collect: its storage-permission refusal comes after the recorder", RCO, "const SCOPE = scopedEntryPoint({ entry: \"bin/render-collect.mjs\"", "if (!permission.mayWrite) process.exit(3);\nconst SCOPE = scopedEntryPoint({ entry: \"bin/render-collect.mjs\"", "A2-3 ·"],
  ["A16", "placement-measure: the REPO repair (a third subject tool, found by A2-6b)", "subjects/almi-oet/tools/placement-measure.mjs", "const REPO = new URL(\"../../../\", import.meta.url)", "const REPO_REMOVED = new URL(\"../../../\", import.meta.url)", "A2-6b ·"],
  ["A15", "the census: nothing ends a gate-passed run before its recorder exists", QM, "const RUN_COST = runCost({ entryPoint: \"bin/quote-match.mjs\"", "if (process.argv.includes(\"--never\")) process.exit(1);\nconst RUN_COST = runCost({ entryPoint: \"bin/quote-match.mjs\"", "A2-1 ·"],
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
const run = () => spawnSync(process.execPath, ["--test", T], { cwd: REPO, encoding: "utf8", timeout: 1800000 });
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function failureClassOf(out, prefix) {
  const ls = out.split(/\r?\n/);
  const start = ls.findIndex((x) => /✖ failing tests:/.test(x));
  const at = ls.findIndex((l, i) => i > start && new RegExp(`^✖ ${esc(prefix)} `).test(l));
  const detail = at < 0 ? null : ls.slice(at + 1).find((l) => l.trim() !== "");
  return detail ? detail.trim().split(/[ :[]/)[0] : null;
}
const base = run();
const baseOut = `${base.stdout}${base.stderr}`;
const baseGreen = base.status === 0 && RUN.every((s) => new RegExp(`✔ ${esc(s[5])} `).test(baseOut)) && !/ℹ skipped [1-9]/.test(baseOut);
const lines = [
  `RR-244 F78 Amendment 2 sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
  `population: ${RUN.length} sabotage(s) — one per limb of the Amendment 2 text and per repair this round made`,
  `BASELINE: ${baseGreen ? "GREEN (every named test passed, none skipped)" : "NOT GREEN — no sabotage is run"}`,
  `PRE-FLIGHT (span occurrences in the code now): ${preflight.map(([id, n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, file, from, to, named] of baseGreen ? RUN : []) {
  const text0 = textOf(file), original = originals.get(file);
  if (occurrences(text0, from) !== 1 || to === from) { lines.push(`${id} ${limb}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); console.log(lines.at(-1)); continue; }
  const ff = inEol(text0, from), at = text0.indexOf(ff);
  writeFileSync(join(REPO, file), text0.slice(0, at) + inEol(text0, to) + text0.slice(at + ff.length), "utf8");
  const landed = sha(read(file)) !== sha(original);
  let out = "", failing = [];
  try { const r = run(); out = `${r.stdout}${r.stderr}`; failing = [...out.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]); }
  finally { writeFileSync(join(REPO, file), original); }
  const restored = sha(read(file)) === sha(original);
  const red = failing.some((n) => n.startsWith(`${named} `));
  const cls = failureClassOf(out, named);
  const ok = landed && red && cls === "AssertionError" && restored;
  if (ok) proved += 1;
  lines.push(`${id} ${limb} · ${file}: landed ${landed} · "${named}" red ${red} · its failure ${cls ?? "none"} · restored ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`);
  console.log(lines.at(-1));
}
const after = run();
const greenAgain = after.status === 0;
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `GREEN after restore: ${greenAgain}`, `proved ${proved} of ${RUN.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(dirname(EVIDENCE), { recursive: true });
writeFileSync(EVIDENCE, lines.join("\n") + "\n", { flag: "wx" });
console.log(lines.slice(-2).join("\n"));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === RUN.length && greenAgain ? 0 : 1;
