/**
 * 🔴 F18 · THE OBSERVED-VS-ESTIMATE RULE CAN FAIL — one sabotage per protection of each clause of F18's frozen acceptance (_handoffs AlmiVisibility_F18_ACCEPTANCE_2026-10-18.md and its Amendments 1 and 2, beta-g decision D, RR-284/285/286)
 * in src/research/demand-evidence.mjs; the named test of test/f18-demand-evidence.test.mjs must turn red by an AssertionError.
 * Each span found EXACTLY ONCE, applied ALONE, restored by raw-byte sha256, the production trail hashed before and after. The engine of
 * test/helpers/rr282-batch-append-sabotage.mjs.
 *
 *   node test/helpers/f18-sabotage.mjs --deliberate [--practice] [--only=<id>]     NOT part of `npm test`
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { badFindingsFirst } from "../../src/report/owner-workflows.mjs"; // RR-287 (F88 C5): bad findings and NOT DONE first
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const IC = "src/research/demand-evidence.mjs", T = "test/f18-demand-evidence.test.mjs";
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `f18-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

/* [id, limb, [[file, from, to], …], test file, named-test prefix, reason (optional)] */
const SABOTAGES = [
  ["D1", "C1 · every need labelled OBSERVED", [[IC, "label: observed ? DEMAND.OBSERVED : DEMAND.ESTIMATE,", "label: DEMAND.OBSERVED,"]], T, "C1 · ESTIMATE IS LABELLED · FIRING CONTROL:"],
  ["D2", "C2 · a record claiming OBSERVED without its source and date is accepted", [[IC, "if (claims && r.record_type !== \"research_derived_question\") return Object.freeze({ refused: DEMAND_REFUSAL.OBSERVED_WITHOUT_SOURCE });", "if (claims) return Object.freeze({ demand: DEMAND.OBSERVED, source: null, date: null });"]], T, "C2 · NEVER MIXED · FIRING CONTROL:"],
  ["D3", "C3 · an estimate beside an observation is not SUPERSEDED", [[IC, "state: observed ? DEMAND.SUPERSEDED : DEMAND.ESTIMATE,", "state: DEMAND.ESTIMATE,"]], T, "C3 · REPLACED BY DATA · FIRING CONTROL:"],
  ["D4", "C4 · an estimate alone creates a page candidate", [[IC, "if (n.label === DEMAND.OBSERVED && n.observedIn.length > 0) { candidates.push(n.needId); continue; }", "if (true) { candidates.push(n.needId); continue; }"]], T, "C4 · NO PAGE BY ESTIMATE ALONE · FIRING CONTROL:"],
  ["D8", "C4 · an estimate with no answer of its own becomes an OPPORTUNITY", [[IC, "if (answer.length > 0) { candidates.push(n.needId);", "if (true) { candidates.push(n.needId);"]], T, "C4 · NO PAGE BY ESTIMATE ALONE · FIRING CONTROL:"],
  ["D5", "C4 · a page question with no source of its own goes unlisted", [[IC, "if (!own) out.push(", "if (false) out.push("]], T, "C4 · NO PAGE BY ESTIMATE ALONE · FIRING CONTROL:"],
  ["D6", "C3 · a joined observation never reaches the page need", [[IC, "...joinedTo(joins, page, item.needKey)];", "];"]], T, "C3 · REPLACED BY DATA · FIRING CONTROL:"],
  ["D7", "C4 · a joined observation never gives the page question its source", [[IC, "...joinedTo(joins, p.publishedUrl, it.needKey)];", "];"]], T, "C4 · NO PAGE BY ESTIMATE ALONE · FIRING CONTROL:"],
];

const RUN = ONLY ? SABOTAGES.filter((s) => s[0] === ONLY) : SABOTAGES;
if (ONLY && RUN.length !== 1 && ONLY !== "CENSUS") { console.error(`REFUSED — no sabotage ${ONLY}`); process.exit(2); }
if (existsSync(EVIDENCE)) { console.error(`REFUSED — ${EVIDENCE} exists; an earlier run's evidence is never overwritten`); process.exit(2); }
const files = [...new Set(SABOTAGES.flatMap((s) => s[2].map((x) => x[0])))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const inEol = (text, s) => (text.includes("\r\n") ? s.replace(/\n/g, "\r\n") : s);
const occurrences = (text, s) => text.split(inEol(text, s)).length - 1;
const preflight = RUN.map(([id, , spans]) => [id, spans.map(([f, from]) => occurrences(originals.get(f).toString("utf8"), from))]);
const allOnce = preflight.every(([, ns]) => ns.every((x) => x === 1));
const trailBefore = sha(read(TRAIL));
const run = (testFile) => spawnSync(process.execPath, ["--test", testFile], { cwd: REPO, encoding: "utf8", timeout: 900000 });
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The first detail line under the named test's entry in the runner's failure summary — its error class. */
function failureClassOf(out, prefix) {
  const ls = out.split(/\r?\n/);
  const at = ls.findIndex((l, i) => i > ls.findIndex((x) => /✖ failing tests:/.test(x)) && new RegExp(`^✖ ${esc(prefix)} `).test(l));
  const detail = at < 0 ? null : ls.slice(at + 1).find((l) => l.trim() !== "");
  return detail ? detail.trim().split(/[ :[]/)[0] : null;
}
/* BASELINE: every test file the limbs name, before any sabotage; each named test must be seen GREEN */
const testFiles = [...new Set(RUN.map((s) => s[3]))];
const baseOut = new Map(testFiles.map((t) => { const r = run(t); return [t, { ok: r.status === 0, out: `${r.stdout}${r.stderr}` }]; }));
const baselineGreen = [...baseOut.values()].every((x) => x.ok);
const seenGreen = ([, , , t, p]) => new RegExp(`✔ ${esc(p)} `).test(baseOut.get(t).out);
const namedGreen = RUN.every(seenGreen);
const lines = [
  `F18 sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
  `population: ${RUN.length} source sabotage(s) over ${testFiles.join(" + ")} · each applied ALONE · the real records are only READ; no network`,
  `BASELINE (the named test files before any sabotage): ${baselineGreen && namedGreen ? "GREEN" : "NOT GREEN — no sabotage is run"} · files green ${[...baseOut.values()].filter((x) => x.ok).length} of ${testFiles.length} · named tests seen GREEN ${RUN.filter(seenGreen).length} of ${RUN.length}`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, ns]) => `${id}=${ns.join("+")}`).join(" ")} · all exactly once: ${allOnce}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, spans, testFile, expect, reason] of baselineGreen && namedGreen ? RUN : []) {
  if (!spans.every(([f, from]) => occurrences(originals.get(f).toString("utf8"), from) === 1)) { lines.push(`${id} ${limb}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); console.log(lines.at(-1)); continue; }
  const touched = [...new Set(spans.map((s) => s[0]))];
  for (const f of touched) {
    let text = originals.get(f).toString("utf8");
    for (const [, from, to] of spans.filter((s) => s[0] === f)) { const ff = inEol(text, from); const at = text.indexOf(ff); text = text.slice(0, at) + inEol(text, to) + text.slice(at + ff.length); }
    writeFileSync(join(REPO, f), text, "utf8");
  }
  const landed = touched.every((f) => sha(read(f)) !== sha(originals.get(f)));
  let failing = [], out = "";
  try {
    const r = run(testFile);
    out = `${r.stdout}${r.stderr}`;
    failing = [...out.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]);
  } finally {
    for (const f of touched) writeFileSync(join(REPO, f), originals.get(f));
  }
  const restored = touched.every((f) => sha(read(f)) === sha(originals.get(f)));
  const red = failing.some((n) => n.startsWith(`${expect} `));
  const cls = failureClassOf(out, expect);
  const byAssertion = cls === "AssertionError";
  const why = reason ? reason.test(out) : true;
  const syntax = /SyntaxError/.test(out);
  const ok = landed && red && byAssertion && why && !syntax && restored;
  if (ok) proved += 1;
  const line = `${id} ${limb} [${touched.join(", ")}] → ${testFile}: landed ${landed} · named test "${expect}" red ${red} · its failure ${cls ?? "none"}${reason ? ` · its reason ${why}` : ""} · SyntaxError ${syntax} · failing ${[...new Set(failing.map((n) => n.split(" · ")[0]))].join(",")} · restored ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
const total = RUN.length;
const totalProved = proved;
lines.push("", `proved ${totalProved} of ${total} (source ${proved} of ${RUN.length}) · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(dirname(EVIDENCE), { recursive: true });
writeFileSync(EVIDENCE, badFindingsFirst(lines.join("\n") + "\n"), { flag: "wx" });
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore && totalProved === total ? 0 : 1;
